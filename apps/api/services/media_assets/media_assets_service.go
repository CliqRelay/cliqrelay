package media_assets

import (
	"context"
	"strings"

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
	hooks           *interfaces.MediaAssetHooks
}

func NewMediaAssetsService(
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	stepsRepo interfaces.StepsRepository,
	guidesRepo interfaces.GuidesRepository,
	hooks *interfaces.MediaAssetHooks,
) *MediaAssetsService {
	return &MediaAssetsService{
		mediaAssetsRepo: mediaAssetsRepo,
		stepsRepo:       stepsRepo,
		guidesRepo:      guidesRepo,
		hooks:           hooks,
	}
}

func (s *MediaAssetsService) Create(ctx context.Context, userID string, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	step, err := s.stepsRepo.GetByID(ctx, req.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	if _, err := s.getGuideForMediaAsset(ctx, userID, step.GuideID.String()); err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.BeforeCreate != nil {
		if err := s.hooks.BeforeCreate(ctx, userID, req); err != nil {
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
		if err := s.hooks.AfterCreate(ctx, userID, mediaAsset); err != nil {
			return nil, err
		}
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByID(ctx context.Context, userID string, mediaAssetID string) (*models.MediaAsset, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

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

	if _, err := s.getGuideForMediaAsset(ctx, userID, step.GuideID.String()); err != nil {
		return nil, err
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByStepID(ctx context.Context, userID string, stepID string) ([]*models.MediaAsset, error) {
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

	if _, err := s.getGuideForMediaAsset(ctx, userID, step.GuideID.String()); err != nil {
		return nil, err
	}

	mediaAssets, err := s.mediaAssetsRepo.GetByStepID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

func (s *MediaAssetsService) Update(ctx context.Context, userID string, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	parsedID, err := uuid.Parse(mediaAssetID)
	if err != nil {
		return nil, constants.ErrInvalidMediaAssetID
	}

	if _, err := s.GetByID(ctx, userID, mediaAssetID); err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, userID, req); err != nil {
			return nil, err
		}
	}

	mediaAsset, err := s.mediaAssetsRepo.Update(ctx, &types.UpdateMediaAssetDTO{
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
	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if s.hooks != nil && s.hooks.AfterUpdate != nil {
		if err := s.hooks.AfterUpdate(ctx, userID, mediaAsset); err != nil {
			return nil, err
		}
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) Delete(ctx context.Context, userID string, mediaAssetID string) (*models.MediaAsset, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	if _, err := s.GetByID(ctx, userID, mediaAssetID); err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, mediaAssetID, ""); err != nil {
			return nil, err
		}
	}

	mediaAsset, err := s.mediaAssetsRepo.Delete(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if s.hooks != nil && s.hooks.AfterDelete != nil {
		if err := s.hooks.AfterDelete(ctx, mediaAssetID, ""); err != nil {
			return nil, err
		}
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) getGuideForMediaAsset(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
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
