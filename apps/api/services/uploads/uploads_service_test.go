package uploads_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestUploadsService_GeneratePresignedPutURL(t *testing.T) {
	t.Parallel()

	const bucket = "test-bucket"
	stepAction := models.StepActionClick

	type testCase struct {
		name    string
		guideID string
		stepID  string
		setup   func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService, string, string)
		wantErr bool
	}

	successGuideID := uuid.New()
	successStepID := uuid.New()
	errGuideID := uuid.New()
	errStepID := uuid.New()
	cases := []testCase{
		{
			name:    "generates presigned URL successfully",
			guideID: successGuideID.String(),
			stepID:  successStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   uuid.MustParse(gid),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockPresignClient.On("PutURL", mock.Anything, bucket, mock.Anything, "image/webp").
					Return("https://test-bucket.s3.amazonaws.com/uploads/test-key", nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error for empty step ID",
			guideID: uuid.New().String(),
			stepID:  "",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error when step not found",
			guideID: errGuideID.String(),
			stepID:  errStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates step repository error",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates presign client error",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   uuid.MustParse(gid),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockPresignClient.On("PutURL", mock.Anything, bucket, mock.Anything, "image/webp").
					Return("", assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, tt.guideID, tt.stepID)
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, tests.NewTestRedisClient(t), nil, bucket)

			result, err := svc.GeneratePresignedPutURL(context.Background(), tt.guideID, tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				if tt.guideID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidGuideID)
				}
				if tt.stepID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Equal(t, "https://test-bucket.s3.amazonaws.com/uploads/test-key", result.URL)
				assert.Contains(t, result.StoragePath, "uploads/guides/")
			}

			mockGuidesRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}
