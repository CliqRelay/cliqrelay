package media_assets_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	mediaassetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestMediaAssetsService_Create(t *testing.T) {
	t.Parallel()

	altText := "test alt text"
	mimeType := "image/png"
	height := 100
	width := 200
	byteSize := 5000

	cases := []struct {
		name    string
		userID  string
		req     *types.CreateMediaAssetRequest
		setup   func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:   "creates media asset successfully",
			userID: "test-ma-create-user",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
				MimeType:    &mimeType,
				AltText:     &altText,
				Height:      &height,
				Width:       &width,
				ByteSize:    &byteSize,
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-create-user", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-create-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
						MimeType:    &mimeType,
						AltText:     &altText,
						Height:      &height,
						Width:       &width,
						ByteSize:    &byteSize,
					}, nil).
					Once()
			},
		},
		{
			name:   "returns error for empty user ID",
			userID: "",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error for whitespace user ID",
			userID: "   ",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			userID: "test-ma-create-step-not-found",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "returns error when guide not found",
			userID: "test-ma-create-guide-not-found",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-create-guide-not-found", guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			userID: "test-ma-create-propagate",
			req: &types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-create-propagate", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-create-propagate",
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

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Create(context.Background(), tt.userID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
				if tt.userID == "" || tt.userID == "   " {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, mediaAsset)
				assert.Equal(t, "uploads/test.png", mediaAsset.StoragePath)
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}

func TestMediaAssetsService_GetByID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name         string
		userID       string
		mediaAssetID string
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "returns media asset successfully",
			userID:       "test-ma-get-by-id",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-get-by-id", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-get-by-id",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
		},
		{
			name:         "returns error for empty user ID",
			userID:       "",
			mediaAssetID: uuid.New().String(),
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error for empty ID",
			userID:       "test-ma-get-by-id-empty",
			mediaAssetID: "",
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error when media asset not found",
			userID:       uuid.New().String(),
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			userID:       uuid.New().String(),
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.GetByID(context.Background(), tt.userID, tt.mediaAssetID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
				if tt.mediaAssetID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidMediaAssetID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, mediaAsset)
				assert.Equal(t, "uploads/test.png", mediaAsset.StoragePath)
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}

func TestMediaAssetsService_GetByStepID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		userID  string
		stepID  string
		setup   func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr bool
		wantLen int
	}{
		{
			name:   "returns media assets successfully",
			userID: "test-ma-get-by-step",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-get-by-step", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-get-by-step",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: "uploads/test.png"},
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: "uploads/test2.jpg"},
					}, nil).
					Once()
			},
			wantLen: 2,
		},
		{
			name:   "returns error for empty user ID",
			userID: "",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error for empty step ID",
			userID: "test-ma-get-by-step-empty",
			stepID: "",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			userID: uuid.New().String(),
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "returns error when guide not found",
			userID: "test-ma-get-by-step-guide-not-found",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-get-by-step-guide-not-found", guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			userID: "test-ma-get-by-step-propagate",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-get-by-step-propagate", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-get-by-step-propagate",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAssets, err := svc.GetByStepID(context.Background(), tt.userID, tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAssets)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
				if tt.stepID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
				assert.Len(t, mediaAssets, tt.wantLen)
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}

func TestMediaAssetsService_Update(t *testing.T) {
	t.Parallel()

	altText := "updated alt text"
	mimeType := "image/jpeg"
	height := 300
	width := 400
	byteSize := 10000

	cases := []struct {
		name         string
		userID       string
		mediaAssetID string
		req          *types.UpdateMediaAssetRequest
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "updates media asset successfully",
			userID:       "test-ma-update-success",
			mediaAssetID: uuid.New().String(),
			req: &types.UpdateMediaAssetRequest{
				AltText:  &altText,
				MimeType: &mimeType,
				Height:   &height,
				Width:    &width,
				ByteSize: &byteSize,
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-update-success", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-update-success",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateMediaAssetDTO")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
						MimeType:    &mimeType,
						AltText:     &altText,
						Height:      &height,
						Width:       &width,
						ByteSize:    &byteSize,
					}, nil).
					Once()
			},
		},
		{
			name:         "returns error for empty user ID",
			userID:       "",
			mediaAssetID: uuid.New().String(),
			req:          &types.UpdateMediaAssetRequest{},
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error for empty ID",
			userID:       uuid.New().String(),
			mediaAssetID: "",
			req:          &types.UpdateMediaAssetRequest{},
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error for invalid UUID",
			userID:       uuid.New().String(),
			mediaAssetID: "not-a-uuid",
			req:          &types.UpdateMediaAssetRequest{},
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error when media asset not found",
			userID:       "test-ma-update-not-found",
			mediaAssetID: uuid.New().String(),
			req: &types.UpdateMediaAssetRequest{
				AltText: &altText,
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-update-not-found", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-update-not-found",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateMediaAssetDTO")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			userID:       "test-ma-update-propagate",
			mediaAssetID: uuid.New().String(),
			req: &types.UpdateMediaAssetRequest{
				AltText: &altText,
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-update-propagate", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-update-propagate",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateMediaAssetDTO")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Update(context.Background(), tt.userID, tt.mediaAssetID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
				if tt.mediaAssetID == "" || tt.mediaAssetID == "not-a-uuid" {
					assert.ErrorIs(t, err, constants.ErrInvalidMediaAssetID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, mediaAsset)
				assert.Equal(t, "image/jpeg", *mediaAsset.MimeType)
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}

func TestMediaAssetsService_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name         string
		userID       string
		mediaAssetID string
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "deletes media asset successfully",
			userID:       "test-ma-delete-success",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-delete-success", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-delete-success",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
			},
		},
		{
			name:         "returns error for empty user ID",
			userID:       "",
			mediaAssetID: uuid.New().String(),
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error for empty ID",
			userID:       uuid.New().String(),
			mediaAssetID: "",
			setup:        func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			wantErr:      true,
		},
		{
			name:         "returns error when media asset not found",
			userID:       "test-ma-delete-not-found",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-delete-not-found", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-delete-not-found",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			userID:       "test-ma-delete-propagate",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-ma-delete-propagate", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-ma-delete-propagate",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Delete(context.Background(), tt.userID, tt.mediaAssetID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
				if tt.mediaAssetID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidMediaAssetID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, mediaAsset)
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
