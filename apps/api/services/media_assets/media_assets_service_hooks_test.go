package media_assets_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	mediaassetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestMediaAssetsService_Create_Hooks(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *interfaces.MediaAssetHooks)
		wantErr bool
	}{
		{
			name: "runs registered before create hook and creates the asset",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, hooks *interfaces.MediaAssetHooks) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{ID: uuid.New(), GuideID: uuid.New()}, nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *types.CreateMediaAssetRequest) error {
					return nil
				})
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{ID: uuid.New(), StepID: uuid.New()}, nil).
					Once()
			},
		},
		{
			name: "returns before create hook error",
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, hooks *interfaces.MediaAssetHooks) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{ID: uuid.New(), GuideID: uuid.New()}, nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *types.CreateMediaAssetRequest) error {
					return assert.AnError
				})
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			hooks := &interfaces.MediaAssetHooks{}
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, hooks)
			svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, new(tests.MockGuidesRepository), hooks)

			// Act
			asset, err := svc.Create(context.Background(), &types.CreateMediaAssetRequest{StepID: uuid.New()})

			// Assert
			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Nil(t, asset)
			} else {
				require.NoError(t, err)
				require.NotNil(t, asset)
			}
			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
		})
	}
}
