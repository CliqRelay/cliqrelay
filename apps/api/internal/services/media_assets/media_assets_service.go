package media_assets

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/internal/constants"
	"github.com/CliqRelay/cliqrelay/internal/interfaces"
	"github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type MediaAssetsService struct {
	mediaAssetsRepo interfaces.MediaAssetsRepository
	stepsRepo       interfaces.StepsRepository
	guidesRepo      interfaces.GuidesRepository
}

func NewMediaAssetsService(
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	stepsRepo interfaces.StepsRepository,
	guidesRepo interfaces.GuidesRepository,
) *MediaAssetsService {
	return &MediaAssetsService{
		mediaAssetsRepo: mediaAssetsRepo,
		stepsRepo:       stepsRepo,
		guidesRepo:      guidesRepo,
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

	guide, err := s.guidesRepo.GetByID(ctx, userID, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
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

	guide, err := s.guidesRepo.GetByID(ctx, userID, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
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

	return mediaAsset, nil
}

func (s *MediaAssetsService) Delete(ctx context.Context, mediaAssetID string) (*models.MediaAsset, error) {
	if strings.TrimSpace(mediaAssetID) == "" {
		return nil, constants.ErrInvalidMediaAssetID
	}

	mediaAsset, err := s.mediaAssetsRepo.Delete(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}

	if mediaAsset == nil {
		return nil, constants.ErrMediaAssetNotFound
	}

	return mediaAsset, nil
}
