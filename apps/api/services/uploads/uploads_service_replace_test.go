package uploads_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/models"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestUploadsService_ReplaceUpload(t *testing.T) {
	t.Parallel()

	const bucket = "test-bucket"
	stepAction := models.StepActionClick
	guideID := uuid.New()
	stepID := uuid.New()
	newPath := fmt.Sprintf("uploads/guides/%s/steps/%s/200.webp", guideID, stepID)
	oldPath := fmt.Sprintf("uploads/guides/%s/steps/%s/100.webp", guideID, stepID)
	mimeType := "image/webp"
	fileSize := 2048

	step := func() *models.Step {
		return &models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0", Action: &stepAction}
	}
	oldAsset := func() *models.MediaAsset {
		return &models.MediaAsset{ID: uuid.New(), StepID: stepID, StoragePath: oldPath}
	}
	newAsset := func() *models.MediaAsset {
		return &models.MediaAsset{ID: uuid.New(), StepID: stepID, StoragePath: newPath, MimeType: &mimeType, ByteSize: &fileSize}
	}

	type testCase struct {
		name        string
		dto         *types.ReplaceUploadDTO
		redis       func(t *testing.T) *redis.Client
		setup       func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService)
		wantErr     error
		wantEvents  int
		checkResult func(t *testing.T, res *types.ReplaceUploadResponse)
	}

	cases := []testCase{
		{
			name: "replaces existing asset and publishes one delete event",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath, MimeType: &mimeType, FileSize: &fileSize},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return([]*models.MediaAsset{oldAsset()}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateMediaAssetDTO) bool {
					return dto.StepID == stepID && dto.StoragePath == newPath && *dto.MimeType == mimeType && *dto.ByteSize == fileSize
				})).Return(newAsset(), nil).Once()
				presign.On("GetURL", mock.Anything, bucket, newPath).Return("https://cdn/"+newPath, nil).Once()
			},
			wantEvents: 1,
			checkResult: func(t *testing.T, res *types.ReplaceUploadResponse) {
				assert.Equal(t, "https://cdn/"+newPath, res.URL)
				assert.Equal(t, newPath, res.StoragePath)
				require.NotNil(t, res.MediaAsset)
				require.NotNil(t, res.MediaAsset.URL)
				assert.Equal(t, res.URL, *res.MediaAsset.URL)
			},
		},
		{
			name: "creates asset when none exists and publishes nothing",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return([]*models.MediaAsset{}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.Anything).Return(newAsset(), nil).Once()
				presign.On("GetURL", mock.Anything, bucket, newPath).Return("https://cdn/"+newPath, nil).Once()
			},
			wantEvents: 0,
		},
		{
			name: "same-path retry publishes nothing",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return([]*models.MediaAsset{newAsset()}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.Anything).Return(newAsset(), nil).Once()
				presign.On("GetURL", mock.Anything, bucket, newPath).Return("https://cdn/"+newPath, nil).Once()
			},
			wantEvents: 0,
		},
		{
			name:    "rejects empty step ID",
			dto:     &types.ReplaceUploadDTO{StepID: "", StoragePath: newPath},
			setup:   func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService) {},
			wantErr: constants.ErrInvalidStepID,
		},
		{
			name:    "rejects invalid step ID",
			dto:     &types.ReplaceUploadDTO{StepID: "not-a-uuid", StoragePath: newPath},
			setup:   func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService) {},
			wantErr: constants.ErrInvalidStepID,
		},
		{
			name:    "rejects empty storage path",
			dto:     &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: ""},
			setup:   func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService) {},
			wantErr: constants.ErrInvalidStoragePath,
		},
		{
			name: "returns not found when step is missing",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(nil, nil).Once()
			},
			wantErr: constants.ErrStepNotFound,
		},
		{
			name: "rejects storage path outside the step prefix",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: fmt.Sprintf("uploads/guides/%s/steps/%s/1.webp", uuid.New(), uuid.New())},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
			},
			wantErr: constants.ErrInvalidStoragePath,
		},
		{
			name: "does not create when delete fails",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return(nil, assert.AnError).Once()
			},
			wantErr: assert.AnError,
		},
		{
			name: "propagates create failure and publishes nothing",
			dto:  &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return([]*models.MediaAsset{oldAsset()}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.Anything).Return(nil, assert.AnError).Once()
			},
			wantErr:    assert.AnError,
			wantEvents: 0,
		},
		{
			name:  "publish failure does not fail the request",
			dto:   &types.ReplaceUploadDTO{StepID: stepID.String(), StoragePath: newPath},
			redis: tests.NewUnreachableRedis,
			setup: func(stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step(), nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).Return([]*models.MediaAsset{oldAsset()}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.Anything).Return(newAsset(), nil).Once()
				presign.On("GetURL", mock.Anything, bucket, newPath).Return("https://cdn/"+newPath, nil).Once()
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stepsRepo := new(tests.MockStepsRepository)
			mediaRepo := new(tests.MockMediaAssetsRepository)
			presign := new(tests.MockPresignService)
			tt.setup(stepsRepo, mediaRepo, presign)

			var redisClient *redis.Client
			if tt.redis != nil {
				redisClient = tt.redis(t)
			} else {
				redisClient = tests.NewTestRedisClient(t)
			}
			svc := uploadsservice.NewUploadsService(new(tests.MockGuidesRepository), stepsRepo, mediaRepo, presign, redisClient, nil, bucket)

			res, err := svc.ReplaceUpload(context.Background(), tt.dto)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, res)
			} else {
				require.NoError(t, err)
				require.NotNil(t, res)
				if tt.checkResult != nil {
					tt.checkResult(t, res)
				}
			}

			if tt.redis == nil {
				entries, err := redisClient.XRange(context.Background(), events.TopicMediaAssets, "-", "+").Result()
				require.NoError(t, err)
				assert.Len(t, entries, tt.wantEvents)
				if tt.wantEvents > 0 {
					assert.Contains(t, entries[0].Values["payload"], oldPath)
				}
			}

			stepsRepo.AssertExpectations(t)
			mediaRepo.AssertExpectations(t)
			presign.AssertExpectations(t)
		})
	}
}
