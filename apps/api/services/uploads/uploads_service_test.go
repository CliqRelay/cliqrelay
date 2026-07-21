package uploads_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	authulamodels "github.com/Authula/authula/models"

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
			guideID: successGuideID.String(),
			stepID:  successStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   parsedGuideID,
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
			name:    "returns error when guide not found",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates guide repository error",
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when step not found",
			guideID: errGuideID.String(),
			stepID:  errStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(&models.Guide{
						ID:        uuid.MustParse(gid),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
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
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(&models.Guide{
						ID:        uuid.MustParse(gid),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when step does not belong to guide",
			guideID: uuid.New().String(),
			stepID:  mismatchStepID.String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
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
			guideID: uuid.New().String(),
			stepID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService, gid, sid string) {
				parsedGuideID := uuid.MustParse(gid)
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", gid).
					Return(&models.Guide{
						ID:        parsedGuideID,
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(&models.Step{
						ID:        uuid.MustParse(sid),
						GuideID:   parsedGuideID,
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
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, tt.guideID, tt.stepID)
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, mockAuthz, bucket)

			testActor := &authulamodels.Actor{ID: "test-user"}
			result, err := svc.GeneratePresignedPutURL(context.Background(), testActor, "00000000-0000-0000-0000-000000000001", tt.guideID, tt.stepID)

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

func TestUploadsService_CompleteUpload(t *testing.T) {
	t.Parallel()

	const bucket = "test-bucket"
	stepAction := models.StepActionClick

	type testCase struct {
		name        string
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
	storagePath := "uploads/guides/abc/steps/def/123"
	fileSize := 1024
	mimeType := "image/png"
	thumbnailVal := "data:image/webp;base64,UklGRkoAAABXRUJQVlA4WAoAAAAQAAAA"

	cases := []testCase{
		{
			name:        "success",
			stepID:      successStepID.String(),
			storagePath: storagePath,
			fileSize:    &fileSize,
			mimeType:    &mimeType,
			thumbnail:   &thumbnailVal,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user",
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
			name:        "returns error for empty step ID",
			stepID:      "",
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
			},
			wantErr: true,
		},
		{
			name:        "returns error when step not found",
			stepID:      notFoundStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "returns error when step not in user's guide",
			stepID:      mismatchStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "propagates repository error",
			stepID:      errStepID.String(),
			storagePath: storagePath,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:        "propagates media asset creation error",
			stepID:      successStepID.String(),
			storagePath: storagePath,
			fileSize:    &fileSize,
			mimeType:    &mimeType,
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, sid string) {
				parsedStepID := uuid.MustParse(sid)
				mockStepsRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", sid).
					Return(&models.Step{
						ID:        parsedStepID,
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "00000000-0000-0000-0000-000000000001", mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
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
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, tt.stepID)
			if !tt.wantErr {
				mockPresignClient.On("GetURL", mock.Anything, bucket, tt.storagePath).
					Return("https://test-bucket.s3.amazonaws.com/"+tt.storagePath, nil).
					Once()
			}
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, mockAuthz, bucket)

			testActor := &authulamodels.Actor{ID: "test-user"}
			result, err := svc.CompleteUpload(context.Background(), testActor, "00000000-0000-0000-0000-000000000001", tt.stepID, tt.storagePath, tt.fileSize, tt.mimeType, tt.thumbnail, new(100), new(100))

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
