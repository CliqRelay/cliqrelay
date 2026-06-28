package media_assets

import (
	"context"
	"strings"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsService struct {
	mediaAssetsRepo interfaces.MediaAssetsRepository
	stepsRepo       interfaces.StepsRepository
	guidesRepo      interfaces.GuidesRepository
	authzService    interfaces.AuthorizationService
	hooks           *interfaces.MediaAssetHooks
}

func NewMediaAssetsService(
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	stepsRepo interfaces.StepsRepository,
	guidesRepo interfaces.GuidesRepository,
	authzService interfaces.AuthorizationService,
	hooks *interfaces.MediaAssetHooks,
) *MediaAssetsService {
	return &MediaAssetsService{
		mediaAssetsRepo: mediaAssetsRepo,
		stepsRepo:       stepsRepo,
		guidesRepo:      guidesRepo,
		authzService:    authzService,
		hooks:           hooks,
	}
}

func (s *MediaAssetsService) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error) {
	step, err := s.stepsRepo.GetByID(ctx, req.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := s.getGuideForMediaAsset(ctx, actor, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeCreate != nil {
		if err := s.hooks.BeforeCreate(ctx, actor, req); err != nil {
			return nil, err
		}
	}

	mediaAsset, err := s.mediaAssetsRepo.Create(ctx, &types.CreateMediaAssetDTO{
		StepID:      req.StepID,
		StoragePath: req.StoragePath,
		MimeType:    req.MimeType,
		AltText:     req.AltText,
		Height:      req.Height,
		Width:       req.Width,
		ByteSize:    req.ByteSize,
	})
	if err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.AfterCreate != nil {
		if err := s.hooks.AfterCreate(ctx, actor, mediaAsset); err != nil {
			return nil, err
		}
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByID(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error) {
	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	mediaAsset, err := s.mediaAssetsRepo.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	step, err := s.stepsRepo.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := s.getGuideForMediaAsset(ctx, actor, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := s.authzService.CanReadGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByStepID(ctx context.Context, actor *authulamodels.Actor, stepID string) ([]*models.MediaAsset, error) {
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

	guide, err := s.getGuideForMediaAsset(ctx, actor, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := s.authzService.CanReadGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	mediaAssets, err := s.mediaAssetsRepo.GetByStepID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

func (s *MediaAssetsService) Update(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error) {
	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	parsedID, err := uuid.Parse(mediaAssetID)
	if err != nil {
		return nil, constants.ErrInvalidMediaAssetID
	}

	mediaAsset, err := s.mediaAssetsRepo.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	step, err := s.stepsRepo.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := s.getGuideForMediaAsset(ctx, actor, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, actor, req); err != nil {
			return nil, err
		}
	}

	updated, err := s.mediaAssetsRepo.Update(ctx, &types.UpdateMediaAssetDTO{
		ID:       parsedID,
		AltText:  req.AltText,
		MimeType: req.MimeType,
		Height:   req.Height,
		Width:    req.Width,
		ByteSize: req.ByteSize,
	})
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if s.hooks != nil && s.hooks.AfterUpdate != nil {
		if err := s.hooks.AfterUpdate(ctx, actor, updated); err != nil {
			return nil, err
		}
	}

	return updated, nil
}

func (s *MediaAssetsService) Delete(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error) {
	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	mediaAsset, err := s.mediaAssetsRepo.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	step, err := s.stepsRepo.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := s.getGuideForMediaAsset(ctx, actor, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, actor, mediaAssetID); err != nil {
			return nil, err
		}
	}

	deleted, err := s.mediaAssetsRepo.Delete(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if deleted == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if s.hooks != nil && s.hooks.AfterDelete != nil {
		if err := s.hooks.AfterDelete(ctx, actor, mediaAssetID); err != nil {
			return nil, err
		}
	}

	return deleted, nil
}

func (s *MediaAssetsService) getGuideForMediaAsset(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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
