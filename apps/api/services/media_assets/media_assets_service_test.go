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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
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

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			ctx := context.Background()
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Create(ctx, "00000000-0000-0000-0000-000000000001", tt.req)

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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
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
			ctx := context.Background()
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.GetByID(ctx, tt.mediaAssetID)

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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.Anything).
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
			ctx := context.Background()
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAssets, err := svc.GetByStepID(ctx, tt.stepID)

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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error for invalid UUID",
			mediaAssetID: "not-a-uuid",
			req:          &types.UpdateMediaAssetRequest{},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
			mediaAssetID: uuid.New().String(),
			req: &types.UpdateMediaAssetRequest{
				AltText: &altText,
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.Anything).
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
			ctx := context.Background()
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Update(ctx, tt.mediaAssetID, tt.req)

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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
			},
			wantErr: true,
		},
		{
			name:         "returns error when media asset not found",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			mediaAssetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.Anything).
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
			ctx := context.Background()
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))

			mediaAsset, err := svc.Delete(ctx, tt.mediaAssetID)

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
