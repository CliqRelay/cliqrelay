package media_assets_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersmediaassets "github.com/CliqRelay/cliqrelay/handlers/media_assets"
	"github.com/CliqRelay/cliqrelay/models"
	media_assetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestUpdateMediaAssetHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		assetID        string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockMediaAssetsRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:    "success",
			assetID: uuid.New().String(),
			payload: types.UpdateMediaAssetRequest{
				AltText: new("updated alt text"),
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateMediaAssetDTO")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "screenshots/test.png",
						AltText:     new("updated alt text"),
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "updated alt text",
		},
		{
			name:           "invalid JSON body",
			assetID:        uuid.New().String(),
			rawBody:        []byte("{invalid json}"),
			setup:          func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name:    "service error",
			assetID: uuid.New().String(),
			payload: types.UpdateMediaAssetRequest{
				AltText: new("updated alt text"),
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateMediaAssetDTO")).
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
			handler := handlersmediaassets.NewUpdateMediaAssetHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPatch, path, tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPatch, path, tt.payload)
			}
			req.Req.SetPathValue("id", assetID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
					tests.AssertResponseContains(t, req.ReqCtx, "media_asset.alt_text", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}
