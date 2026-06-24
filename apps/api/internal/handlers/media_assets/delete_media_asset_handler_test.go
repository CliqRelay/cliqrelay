package media_assets_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/internal"
	handlersmediaassets "github.com/CliqRelay/cliqrelay/internal/handlers/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/models"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/tests"
)

func TestDeleteMediaAssetHandler(t *testing.T) {
	t.Parallel()

	appConfig := &internal.AppConfig{}

	cases := []struct {
		name           string
		assetID        string
		setup          func(*tests.MockMediaAssetsRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:    "success",
			assetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "screenshots/test.png",
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "Media asset deleted successfully",
		},
		{
			name:    "service error",
			assetID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
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
			tt.setup(mockMediaAssetsRepo)
			svc := media_assetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			handler := handlersmediaassets.NewDeleteMediaAssetHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodDelete, path, nil)
			req.Req.SetPathValue("id", assetID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
					tests.AssertResponseContains(t, req.ReqCtx, "message", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}
