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
	"github.com/CliqRelay/cliqrelay/types"
)

func TestCreateMediaAssetHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "success",
			payload: types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      uuid.New(),
						StoragePath: "uploads/test.png",
					}, nil).
					Once()
			},
			expectedStatus: http.StatusCreated,
			expectedBody:   "uploads/test.png",
		},
		{
			name:    "invalid JSON body",
			rawBody: []byte("{invalid json}"),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name: "service error",
			payload: types.CreateMediaAssetRequest{
				StepID:      uuid.New(),
				StoragePath: "uploads/test.png",
			},
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
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

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything).Return(nil)
			svc := media_assetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, mockIdentity, mockAuthz, (*interfaces.MediaAssetHooks)(nil))
			handler := handlersmediaassets.NewCreateMediaAssetHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPost, "/api/v1/media-assets", tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPost, "/api/v1/media-assets", tt.payload)
			}

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusCreated {
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
