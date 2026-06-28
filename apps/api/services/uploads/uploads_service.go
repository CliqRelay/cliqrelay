package uploads

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsService struct {
	guidesRepo      interfaces.GuidesRepository
	stepsRepo       interfaces.StepsRepository
	mediaAssetsRepo interfaces.MediaAssetsRepository
	presignClient   interfaces.PresignService
	identityService interfaces.IdentityService
	authzService    interfaces.AuthorizationService
	bucket          string
}

func NewUploadsService(
	guidesRepo interfaces.GuidesRepository,
	stepsRepo interfaces.StepsRepository,
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	presignClient interfaces.PresignService,
	identityService interfaces.IdentityService,
	authzService interfaces.AuthorizationService,
	bucket string,
) *UploadsService {
	return &UploadsService{
		guidesRepo:      guidesRepo,
		stepsRepo:       stepsRepo,
		mediaAssetsRepo: mediaAssetsRepo,
		presignClient:   presignClient,
		identityService: identityService,
		authzService:    authzService,
		bucket:          bucket,
	}
}

func (s *UploadsService) GeneratePresignedPutURL(ctx context.Context, guideID, stepID string) (*types.PresignedURLResult, error) {
	identity := s.identityService.Current(ctx)

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}
	if strings.TrimSpace(stepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := s.authzService.CanEditGuide(ctx, identity, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	step, err := s.stepsRepo.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}
	if step.GuideID.String() != guideID {
		return nil, constants.ErrStepNotInGuide
	}

	key := fmt.Sprintf("uploads/guides/%s/steps/%s/%d.webp", guideID, stepID, time.Now().UnixNano())

	url, err := s.presignClient.PutURL(ctx, s.bucket, key, "image/webp")
	if err != nil {
		return nil, fmt.Errorf("failed to presign put object: %w", err)
	}

	return &types.PresignedURLResult{
		URL:         url,
		StoragePath: key,
	}, nil
}

func (s *UploadsService) CompleteUpload(ctx context.Context, stepID, storagePath string, fileSize *int, mimeType *string, thumbnail *string, width *int, height *int) (*types.CompleteUploadResponse, error) {
	identity := s.identityService.Current(ctx)

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

	guide, err := s.guidesRepo.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := s.authzService.CanEditGuide(ctx, identity, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	parsedStepID, err := uuid.Parse(stepID)
	if err != nil {
		return nil, fmt.Errorf("invalid step ID: %w", err)
	}

	mediaAsset, err := s.mediaAssetsRepo.Create(ctx, &types.CreateMediaAssetDTO{
		StepID:      parsedStepID,
		StoragePath: storagePath,
		MimeType:    mimeType,
		Thumbnail:   thumbnail,
		ByteSize:    fileSize,
		Width:       width,
		Height:      height,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create media asset: %w", err)
	}

	url, err := s.presignClient.GetURL(ctx, s.bucket, storagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to presign get object: %w", err)
	}

	return &types.CompleteUploadResponse{
		URL:         url,
		StoragePath: mediaAsset.StoragePath,
	}, nil
}
