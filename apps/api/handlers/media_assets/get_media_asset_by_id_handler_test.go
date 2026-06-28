package media_assets_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersmediaassets "github.com/CliqRelay/cliqrelay/handlers/media_assets"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	media_assetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestGetMediaAssetByIDHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		assetID        string
		setup          func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:    "success",
			assetID: uuid.New().String(),
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
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "uploads/test.png",
		},
		{
			name:    "service error",
			assetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			assetID := tt.assetID
			path := "/api/v1/media-assets/" + assetID

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			svc := media_assetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockAuthz, (*interfaces.MediaAssetHooks)(nil))
			handler := handlersmediaassets.NewGetMediaAssetByIDHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodGet, path, nil)
			req.Req.SetPathValue("id", assetID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
					tests.AssertResponseContains(t, req.ReqCtx, "media_asset.storage_path", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
