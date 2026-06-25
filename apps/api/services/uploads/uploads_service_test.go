package uploads_test

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestUploadsService_GeneratePresignedPutURL(t *testing.T) {
	t.Parallel()

	const bucket = "test-bucket"
	stepAction := models.StepActionClick

	type testCase struct {
		name    string
		userID  string
		guideID string
		stepID  string
		setup   func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService, string, string)
		wantErr bool
	}

	successGuideID := uuid.New()
	successStepID := uuid.New()
	errGuideID := uuid.New()
	errStepID := uuid.New()
	mismatchStepID := uuid.New()

	cases := []testCase{
		{
			name:    "generates presigned URL successfully",
			userID:  uuid.New().String(),
			guideID: successGuideID.String(),
			stepID:  successStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   parsedGuideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockPresignClient.On("PutURL", mock.Anything, bucket, mock.AnythingOfType("string"), "image/webp").
					Return("https://test-bucket.s3.amazonaws.com/uploads/test-key", nil).
					Once()
			},
		},
		{
			name:    "returns error for empty user ID",
			userID:  "",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error for whitespace user ID",
			userID:  "   ",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error for empty guide ID",
			userID:  uuid.New().String(),
			guideID: "",
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error for empty step ID",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  "",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates guide repository error",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when step not found",
			userID:  uuid.New().String(),
			guideID: errGuideID.String(),
			stepID:  errStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(&models.Guide{
						ID:        uuid.MustParse(gid),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates step repository error",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(&models.Guide{
						ID:        uuid.MustParse(gid),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when step does not belong to guide",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  mismatchStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   uuid.MustParse("00000000-0000-0000-0000-000000000001"),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates presign client error",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   parsedGuideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockPresignClient.On("PutURL", mock.Anything, bucket, mock.AnythingOfType("string"), "image/webp").
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
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, bucket)

			result, err := svc.GeneratePresignedPutURL(context.Background(), tt.userID, tt.guideID, tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				if strings.TrimSpace(tt.userID) == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
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

func TestUploadsService_CompleteUpload(t *testing.T) {
	t.Parallel()

	const bucket = "test-bucket"
	stepAction := models.StepActionClick

	type testCase struct {
		name        string
		userID      string
		stepID      string
		storagePath string
		fileSize    *int
		mimeType    *string
		thumbnail   *string
		setup       func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, string)
		wantErr     bool
	}

	successStepID := uuid.New()
	errStepID := uuid.New()
	notFoundStepID := uuid.New()
	mismatchStepID := uuid.New()
	creatorUserID := uuid.New().String()
	storagePath := "uploads/guides/abc/steps/def/123"
	fileSize := 1024
	mimeType := "image/png"
	thumbnailVal := "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAA"

	cases := []testCase{
		{
			name:        "success",
			userID:      creatorUserID,
			stepID:      successStepID.String(),
			storagePath: storagePath,
			fileSize:    &fileSize,
			mimeType:    &mimeType,
			thumbnail:   &thumbnailVal,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, creatorUserID, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: creatorUserID,
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateMediaAssetDTO) bool {
					return dto.StepID == parsedStepID && dto.StoragePath == storagePath && *dto.MimeType == mimeType && *dto.ByteSize == fileSize && *dto.Thumbnail == thumbnailVal
				})).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      parsedStepID,
						StoragePath: storagePath,
						MimeType:    &mimeType,
						ByteSize:    &fileSize,
					}, nil).
					Once()
			},
		},
		{
			name:        "returns error for empty user ID",
			userID:      "",
			stepID:      uuid.New().String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
			},
			wantErr: true,
		},
		{
			name:        "returns error for empty step ID",
			userID:      creatorUserID,
			stepID:      "",
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
			},
			wantErr: true,
		},
		{
			name:        "returns error when step not found",
			userID:      creatorUserID,
			stepID:      notFoundStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "returns error when step not in user's guide",
			userID:      creatorUserID,
			stepID:      mismatchStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, creatorUserID, guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "propagates repository error",
			userID:      creatorUserID,
			stepID:      errStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "propagates media asset creation error",
			userID:      creatorUserID,
			stepID:      successStepID.String(),
			storagePath: storagePath,
			fileSize:    &fileSize,
			mimeType:    &mimeType,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				mockStepsRepo.On("GetByID", mock.Anything, sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, creatorUserID, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: creatorUserID,
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
					Return(nil, assert.AnError).
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
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, tt.stepID)
			if !tt.wantErr {
				mockPresignClient.On("GetURL", mock.Anything, bucket, tt.storagePath).
					Return("https://test-bucket.s3.amazonaws.com/"+tt.storagePath, nil).
					Once()
			}
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, bucket)

			result, err := svc.CompleteUpload(context.Background(), tt.userID, tt.stepID, tt.storagePath, tt.fileSize, tt.mimeType, tt.thumbnail, new(100), new(100))

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Equal(t, storagePath, result.StoragePath)
				assert.Contains(t, result.URL, "https://")
				assert.Contains(t, result.URL, bucket)
				assert.Contains(t, result.URL, storagePath)
			}

			mockGuidesRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}
