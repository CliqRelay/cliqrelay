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
		req     *types.CreateMediaAssetRequest
		setup   func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name: "creates media asset successfully",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			name: "returns error when step not found",
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
			name: "returns error when guide not found",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name: "propagates repository error",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Create(context.Background(), tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
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
		mediaAssetID string
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "returns media asset successfully",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
		},
		{
			name:         "returns error for empty ID",
			mediaAssetID: "",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
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
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.GetByID(context.Background(), tt.mediaAssetID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
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
		stepID  string
		setup   func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr bool
		wantLen int
	}{
		{
			name:   "returns media assets successfully",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			name:   "returns error for empty step ID",
			stepID: "",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))

			mediaAssets, err := svc.GetByStepID(context.Background(), tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAssets)
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
		mediaAssetID string
		req          *types.UpdateMediaAssetRequest
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "updates media asset successfully",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			name:         "returns error for empty ID",
			mediaAssetID: "",
			req:          &types.UpdateMediaAssetRequest{},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error for invalid UUID",
			mediaAssetID: "not-a-uuid",
			req:          &types.UpdateMediaAssetRequest{},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Update(context.Background(), tt.mediaAssetID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
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
		mediaAssetID string
		setup        func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErr      bool
	}{
		{
			name:         "deletes media asset successfully",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			name:         "returns error for empty ID",
			mediaAssetID: "",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user",
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
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Delete(context.Background(), tt.mediaAssetID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, mediaAsset)
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
