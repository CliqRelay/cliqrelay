package steps

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsService struct {
	redisClient     *redis.Client
	stepsRepo       interfaces.StepsRepository
	guidesRepo      interfaces.GuidesRepository
	presignClient   interfaces.PresignService
	storageService  interfaces.StorageService
	mediaAssetsRepo interfaces.MediaAssetsRepository
	logger          *slog.Logger
	bucket          string
	hooks           *interfaces.StepHooks
}

func NewStepsService(
	redisClient *redis.Client,
	stepsRepo interfaces.StepsRepository,
	guidesRepo interfaces.GuidesRepository,
	presignClient interfaces.PresignService,
	storageService interfaces.StorageService,
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	bucket string,
	logger *slog.Logger,
	hooks *interfaces.StepHooks,
) *StepsService {
	return &StepsService{
		redisClient:     redisClient,
		stepsRepo:       stepsRepo,
		guidesRepo:      guidesRepo,
		presignClient:   presignClient,
		storageService:  storageService,
		mediaAssetsRepo: mediaAssetsRepo,
		logger:          logger,
		bucket:          bucket,
		hooks:           hooks,
	}
}

func (s *StepsService) Create(ctx context.Context, workspaceID string, req *types.CreateStepRequest) (*models.Step, error) {
	guide, err := s.getGuideForStep(ctx, req.GuideID.String())
	if err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.BeforeCreate != nil {
		if err := s.hooks.BeforeCreate(ctx, workspaceID, req); err != nil {
			return nil, err
		}
	}

	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return nil, constants.ErrWorkspaceNotFound
	}

	step, err := s.stepsRepo.Create(ctx, &types.CreateStepDTO{
		WorkspaceID:        parsedWSID,
		GuideID:            guide.ID,
		Type:               req.Type,
		Action:             req.Action,
		ActionText:         req.ActionText,
		URL:                req.URL,
		Notes:              req.Notes,
		TargetElement:      req.TargetElement,
		CanvasContent:      req.CanvasContent,
		InsertBeforeStepID: req.InsertBeforeStepID,
		InsertAfterStepID:  req.InsertAfterStepID,
	})
	if err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.AfterCreate != nil {
		if err := s.hooks.AfterCreate(ctx, step); err != nil {
			return nil, err
		}
	}

	return step, nil
}

func (s *StepsService) GetByID(ctx context.Context, stepID string) (*models.Step, error) {
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	step, err := s.stepsRepo.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	s.enrichMediaAssets(ctx, step)

	return step, nil
}

func (s *StepsService) GetByGuideID(ctx context.Context, guideID string) ([]*models.Step, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	steps, err := s.stepsRepo.GetByGuideID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	s.enrichMediaAssets(ctx, steps...)

	return steps, nil
}

func (s *StepsService) Update(ctx context.Context, stepID string, req *types.UpdateStepRequest) (*models.Step, error) {
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	parsedID, err := uuid.Parse(stepID)
	if err != nil {
		return nil, constants.ErrInvalidStepID
	}

	step, err := s.stepsRepo.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, step.WorkspaceID.String(), req); err != nil {
			return nil, err
		}
	}

	updated, err := s.stepsRepo.Update(ctx, &types.UpdateStepDTO{
		ID:            parsedID,
		WorkspaceID:   step.WorkspaceID,
		Type:          req.Type,
		Action:        req.Action,
		ActionText:    req.ActionText,
		URL:           req.URL,
		Notes:         req.Notes,
		TargetElement: req.TargetElement,
		CanvasContent: req.CanvasContent,
	})
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, constants.ErrStepNotFound
	}

	s.enrichMediaAssets(ctx, updated)

	if s.hooks != nil && s.hooks.AfterUpdate != nil {
		if err := s.hooks.AfterUpdate(ctx, updated); err != nil {
			return nil, err
		}
	}

	return updated, nil
}

func (s *StepsService) Delete(ctx context.Context, stepID string) error {
	if strings.TrimSpace(stepID) == "" {
		return constants.ErrInvalidStepID
	}

	step, err := s.stepsRepo.GetByID(ctx, stepID)
	if err != nil {
		return err
	}
	if step == nil {
		return constants.ErrStepNotFound
	}

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, step); err != nil {
			return err
		}
	}

	mediaAssets, err := s.mediaAssetsRepo.GetByStepID(ctx, stepID)
	if err != nil {
		return err
	}

	if err := s.stepsRepo.Delete(ctx, stepID); err != nil {
		return err
	}

	if s.hooks != nil && s.hooks.AfterDelete != nil {
		if err := s.hooks.AfterDelete(ctx, stepID); err != nil {
			return err
		}
	}

	if len(mediaAssets) <= 0 {
		return nil
	}

	for _, asset := range mediaAssets {
		if err := events.Publish(ctx, s.redisClient, events.TopicMediaAssets, events.EventTypeMediaAssetDeleted, &events.MediaAssetDeletePayload{
			StepID:      stepID,
			StoragePath: asset.StoragePath,
		}); err != nil {
			s.logger.Error("publish event for asset", "err", err, "step_id", stepID, "storage_path", asset.StoragePath)
		}
	}

	return nil
}

func (s *StepsService) Reorder(ctx context.Context, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	steps, err := s.stepsRepo.Reorder(ctx, guideID, targetStepID, prevStepID, nextStepID)
	if err != nil {
		return nil, err
	}

	return steps, nil
}

func (s *StepsService) Duplicate(ctx context.Context, stepID string, req *types.DuplicateStepRequest) (*models.Step, error) {
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	original, err := s.stepsRepo.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}
	if original == nil {
		return nil, constants.ErrStepNotFound
	}

	insertBeforeStepID := req.InsertBeforeStepID
	insertAfterStepID := req.InsertAfterStepID
	if insertBeforeStepID == nil && insertAfterStepID == nil {
		insertAfterStepID = &stepID
	}

	dto := &types.CreateStepDTO{
		WorkspaceID:        original.WorkspaceID,
		GuideID:            original.GuideID,
		Type:               original.Type,
		Action:             original.Action,
		ActionText:         original.ActionText,
		URL:                original.URL,
		Notes:              original.Notes,
		TargetElement:      original.TargetElement,
		CanvasContent:      original.CanvasContent,
		InsertBeforeStepID: insertBeforeStepID,
		InsertAfterStepID:  insertAfterStepID,
	}

	newStep, err := s.stepsRepo.Create(ctx, dto)
	if err != nil {
		return nil, err
	}

	var copyErrs []error
	oldStepID := stepID
	newStepID := newStep.ID.String()

	for _, asset := range original.MediaAssets {
		if asset == nil || asset.StoragePath == "" {
			continue
		}

		newStoragePath := strings.Replace(
			asset.StoragePath,
			"/steps/"+oldStepID+"/",
			"/steps/"+newStepID+"/",
			1,
		)

		if err := s.storageService.CopyObject(ctx, s.bucket, asset.StoragePath, newStoragePath); err != nil {
			copyErrs = append(copyErrs, fmt.Errorf("%w: %s -> %s: %w", constants.ErrMediaAssetCopyFailed, asset.StoragePath, newStoragePath, err))
			continue
		}

		newThumbnail := asset.Thumbnail

		if _, err := s.mediaAssetsRepo.Create(ctx, &types.CreateMediaAssetDTO{
			StepID:      newStep.ID,
			WorkspaceID: original.WorkspaceID,
			StoragePath: newStoragePath,
			MimeType:    asset.MimeType,
			AltText:     asset.AltText,
			Thumbnail:   newThumbnail,
			Height:      asset.Height,
			Width:       asset.Width,
			ByteSize:    asset.ByteSize,
		}); err != nil {
			copyErrs = append(copyErrs, err)
		}
	}

	if len(copyErrs) > 0 {
		return nil, errors.Join(copyErrs...)
	}

	result, err := s.stepsRepo.GetByID(ctx, newStepID)
	if err != nil {
		return nil, err
	}

	s.enrichMediaAssets(ctx, result)

	return result, nil
}

func (s *StepsService) getGuideForStep(ctx context.Context, guideID string) (*models.Guide, error) {
	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.DeletedAt != nil {
		return nil, constants.ErrGuideDeleted
	}

	return guide, nil
}

func (s *StepsService) enrichMediaAssets(ctx context.Context, steps ...*models.Step) {
	var wg sync.WaitGroup

	for _, step := range steps {
		if step == nil {
			continue
		}
		for _, asset := range step.MediaAssets {
			if asset == nil || asset.StoragePath == "" {
				continue
			}
			wg.Go(func() {
				url, err := s.presignClient.GetURL(ctx, s.bucket, asset.StoragePath)
				if err != nil {
					return
				}
				asset.URL = &url
			})
		}
	}

	wg.Wait()
}
