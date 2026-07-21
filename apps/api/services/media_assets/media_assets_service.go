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

func (s *MediaAssetsService) Create(ctx context.Context, workspaceID string, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error) {
	step, err := s.stepsRepo.GetByID(ctx, req.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
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

	mediaAsset, err := s.mediaAssetsRepo.Create(ctx, &types.CreateMediaAssetDTO{
		StepID:      req.StepID,
		WorkspaceID: parsedWSID,
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
		if err := s.hooks.AfterCreate(ctx, mediaAsset); err != nil {
			return nil, err
		}
	}

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByID(ctx context.Context, mediaAssetID string) (*models.MediaAsset, error) {
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

	return mediaAsset, nil
}

func (s *MediaAssetsService) GetByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error) {
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	mediaAssets, err := s.mediaAssetsRepo.GetByStepID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

func (s *MediaAssetsService) Update(ctx context.Context, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error) {
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

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, mediaAsset.WorkspaceID.String(), req); err != nil {
			return nil, err
		}
	}

	updated, err := s.mediaAssetsRepo.Update(ctx, &types.UpdateMediaAssetDTO{
		ID:          parsedID,
		WorkspaceID: mediaAsset.WorkspaceID,
		AltText:     req.AltText,
		MimeType:    req.MimeType,
		Height:      req.Height,
		Width:       req.Width,
		ByteSize:    req.ByteSize,
	})
	if err != nil {
		return nil, err
	}
	if updated == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if s.hooks != nil && s.hooks.AfterUpdate != nil {
		if err := s.hooks.AfterUpdate(ctx, updated); err != nil {
			return nil, err
		}
	}

	return updated, nil
}

func (s *MediaAssetsService) Delete(ctx context.Context, mediaAssetID string) (*models.MediaAsset, error) {
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

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, mediaAssetID); err != nil {
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
		if err := s.hooks.AfterDelete(ctx, mediaAssetID); err != nil {
			return nil, err
		}
	}

	return deleted, nil
}
