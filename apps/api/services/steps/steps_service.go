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

func NewStepsService(redisClient *redis.Client, stepsRepo interfaces.StepsRepository, guidesRepo interfaces.GuidesRepository, presignClient interfaces.PresignService, storageService interfaces.StorageService, mediaAssetsRepo interfaces.MediaAssetsRepository, bucket string, logger *slog.Logger, hooks *interfaces.StepHooks) *StepsService {
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

func (s *StepsService) Create(ctx context.Context, userID string, req *types.CreateStepRequest) (*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	guide, err := s.getGuideForStep(ctx, userID, req.GuideID.String())
	if err != nil {
		return nil, err
	}

	if s.hooks != nil {
		if err := s.hooks.BeforeCreate(ctx, userID, req); err != nil {
			return nil, err
		}
	}

	step, err := s.stepsRepo.Create(ctx, &types.CreateStepDTO{
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

	if s.hooks != nil {
		if err := s.hooks.AfterCreate(ctx, userID, step); err != nil {
			return nil, err
		}
	}

	return step, nil
}

func (s *StepsService) GetByID(ctx context.Context, userID string, stepID string) (*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

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

	if _, err := s.getGuideForStep(ctx, userID, step.GuideID.String()); err != nil {
		return nil, err
	}

	s.enrichMediaAssets(ctx, step)

	return step, nil
}

func (s *StepsService) GetByGuideID(ctx context.Context, userID string, guideID string) ([]*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	if _, err := s.getGuideForStep(ctx, userID, guideID); err != nil {
		return nil, err
	}

	steps, err := s.stepsRepo.GetByGuideID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	s.enrichMediaAssets(ctx, steps...)

	return steps, nil
}

func (s *StepsService) Update(ctx context.Context, userID string, stepID string, req *types.UpdateStepRequest) (*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	parsedID, err := uuid.Parse(stepID)
	if err != nil {
		return nil, constants.ErrInvalidStepID
	}

	if _, err := s.GetByID(ctx, userID, stepID); err != nil {
		return nil, err
	}

	if s.hooks != nil {
		if err := s.hooks.BeforeUpdate(ctx, userID, req); err != nil {
			return nil, err
		}
	}

	step, err := s.stepsRepo.Update(ctx, &types.UpdateStepDTO{
		ID:            parsedID,
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
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	s.enrichMediaAssets(ctx, step)

	if s.hooks != nil {
		if err := s.hooks.AfterUpdate(ctx, userID, step); err != nil {
			return nil, err
		}
	}

	return step, nil
}

func (s *StepsService) Delete(ctx context.Context, userID string, stepID string) error {
	if strings.TrimSpace(userID) == "" {
		return constants.ErrInvalidUserID
	}

	if strings.TrimSpace(stepID) == "" {
		return constants.ErrInvalidStepID
	}

	step, err := s.GetByID(ctx, userID, stepID)
	if err != nil {
		return err
	}

	if s.hooks != nil {
		if err := s.hooks.BeforeDelete(ctx, userID, step); err != nil {
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

	if s.hooks != nil {
		if err := s.hooks.AfterDelete(ctx, userID, stepID); err != nil {
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

func (s *StepsService) Reorder(ctx context.Context, userID string, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	if _, err := s.getGuideForStep(ctx, userID, guideID); err != nil {
		return nil, err
	}

	steps, err := s.stepsRepo.Reorder(ctx, guideID, targetStepID, prevStepID, nextStepID)
	if err != nil {
		return nil, err
	}

	return steps, nil
}

func (s *StepsService) Duplicate(ctx context.Context, userID string, stepID string, req *types.DuplicateStepRequest) (*models.Step, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	original, err := s.GetByID(ctx, userID, stepID)
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

func (s *StepsService) getGuideForStep(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.CreatorID != userID {
		return nil, constants.ErrGuideNotOwnedByUser
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
