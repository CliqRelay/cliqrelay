package uploads

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type UploadsService struct {
	guidesRepo      interfaces.GuidesRepository
	stepsRepo       interfaces.StepsRepository
	mediaAssetsRepo interfaces.MediaAssetsRepository
	presignClient   interfaces.PresignService
	redisClient     *redis.Client
	logger          *slog.Logger
	bucket          string
}

func NewUploadsService(
	guidesRepo interfaces.GuidesRepository,
	stepsRepo interfaces.StepsRepository,
	mediaAssetsRepo interfaces.MediaAssetsRepository,
	presignClient interfaces.PresignService,
	redisClient *redis.Client,
	logger *slog.Logger,
	bucket string,
) *UploadsService {
	if logger == nil {
		logger = slog.Default()
	}
	return &UploadsService{
		guidesRepo:      guidesRepo,
		stepsRepo:       stepsRepo,
		mediaAssetsRepo: mediaAssetsRepo,
		presignClient:   presignClient,
		redisClient:     redisClient,
		logger:          logger,
		bucket:          bucket,
	}
}

func (s *UploadsService) GeneratePresignedPutURL(ctx context.Context, guideID, stepID string) (*types.PresignedURLResult, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
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

	key := fmt.Sprintf("%s%d.webp", utils.StepUploadPrefix(guideID, stepID), time.Now().UnixNano())

	url, err := s.presignClient.PutURL(ctx, s.bucket, key, constants.StepUploadContentType)
	if err != nil {
		return nil, fmt.Errorf("failed to presign put object: %w", err)
	}

	return &types.PresignedURLResult{
		URL:         url,
		StoragePath: key,
	}, nil
}

func (s *UploadsService) CompleteUpload(ctx context.Context, stepID, storagePath string, fileSize *int, mimeType *string, thumbnail *string, width *int, height *int) (*types.CompleteUploadResponse, error) {
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

func (s *UploadsService) ReplaceUpload(ctx context.Context, dto *types.ReplaceUploadDTO) (*types.ReplaceUploadResponse, error) {
	if strings.TrimSpace(dto.StepID) == "" {
		return nil, constants.ErrInvalidStepID
	}
	if strings.TrimSpace(dto.StoragePath) == "" {
		return nil, constants.ErrInvalidStoragePath
	}

	parsedStepID, err := uuid.Parse(dto.StepID)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", constants.ErrInvalidStepID, err)
	}

	step, err := s.stepsRepo.GetByID(ctx, dto.StepID)
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	if !strings.HasPrefix(dto.StoragePath, utils.StepUploadPrefix(step.GuideID.String(), dto.StepID)) {
		return nil, constants.ErrInvalidStoragePath
	}
	if dto.MimeType == nil || *dto.MimeType != constants.StepUploadContentType {
		return nil, constants.ErrInvalidContentType
	}
	if dto.FileSize == nil || *dto.FileSize <= 0 || *dto.FileSize > constants.StepUploadMaxBytes {
		return nil, constants.ErrInvalidFileSize
	}

	var removed []*models.MediaAsset
	var created *models.MediaAsset
	err = s.mediaAssetsRepo.Tx(ctx, func(ctx context.Context, txRepo interfaces.MediaAssetsRepository) error {
		if err := txRepo.LockStepForUpdate(ctx, parsedStepID); err != nil {
			return err
		}
		removed, err = txRepo.DeleteByStepID(ctx, dto.StepID)
		if err != nil {
			return err
		}
		created, err = txRepo.Create(ctx, &types.CreateMediaAssetDTO{
			StepID:      parsedStepID,
			StoragePath: dto.StoragePath,
			MimeType:    dto.MimeType,
			Thumbnail:   dto.Thumbnail,
			ByteSize:    dto.FileSize,
			Width:       dto.Width,
			Height:      dto.Height,
		})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to replace media asset: %w", err)
	}

	for _, asset := range removed {
		if asset.StoragePath == created.StoragePath {
			continue
		}
		if err := events.Publish(ctx, s.redisClient, events.TopicMediaAssets, events.EventTypeMediaAssetDeleted, &events.MediaAssetDeletePayload{
			StepID:      dto.StepID,
			StoragePath: asset.StoragePath,
		}); err != nil {
			s.logger.Error("publish event for asset", "err", err, "step_id", dto.StepID, "storage_path", asset.StoragePath)
		}
	}

	url, err := s.presignClient.GetURL(ctx, s.bucket, created.StoragePath)
	if err != nil {
		return nil, fmt.Errorf("failed to presign get object: %w", err)
	}
	created.URL = &url

	return &types.ReplaceUploadResponse{
		URL:         url,
		StoragePath: created.StoragePath,
		MediaAsset:  created,
	}, nil
}
