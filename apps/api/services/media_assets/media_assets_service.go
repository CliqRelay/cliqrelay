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

func runMediaAssetHooks(hooks []interfaces.MediaAssetHook, ctx context.Context, asset *models.MediaAsset) error {
	for _, hook := range hooks {
		if err := hook(ctx, asset); err != nil {
			return err
		}
	}
	return nil
}

func runCreateMediaAssetHooks(hooks []interfaces.CreateMediaAssetHook, ctx context.Context, req *types.CreateMediaAssetRequest) error {
	for _, hook := range hooks {
		if err := hook(ctx, req); err != nil {
			return err
		}
	}
	return nil
}

func runUpdateMediaAssetHooks(hooks []interfaces.UpdateMediaAssetHook, ctx context.Context, req *types.UpdateMediaAssetRequest) error {
	for _, hook := range hooks {
		if err := hook(ctx, req); err != nil {
			return err
		}
	}
	return nil
}

func runDeleteMediaAssetHooks(hooks []interfaces.DeleteMediaAssetHook, ctx context.Context, assetID string) error {
	for _, hook := range hooks {
		if err := hook(ctx, assetID); err != nil {
			return err
		}
	}
	return nil
}

func (s *MediaAssetsService) Create(ctx context.Context, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error) {
	step, err := s.stepsRepo.GetByID(ctx, req.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	if err := runCreateMediaAssetHooks(s.hooks.BeforeCreateHooks(), ctx, req); err != nil {
		return nil, err
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

	if err := runMediaAssetHooks(s.hooks.AfterCreateHooks(), ctx, mediaAsset); err != nil {
		return nil, err
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

	if err := runUpdateMediaAssetHooks(s.hooks.BeforeUpdateHooks(), ctx, req); err != nil {
		return nil, err
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

	if err := runMediaAssetHooks(s.hooks.AfterUpdateHooks(), ctx, updated); err != nil {
		return nil, err
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

	if err := runDeleteMediaAssetHooks(s.hooks.BeforeDeleteHooks(), ctx, mediaAssetID); err != nil {
		return nil, err
	}

	deleted, err := s.mediaAssetsRepo.Delete(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}
	if deleted == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	if err := runDeleteMediaAssetHooks(s.hooks.AfterDeleteHooks(), ctx, mediaAssetID); err != nil {
		return nil, err
	}

	return deleted, nil
}
