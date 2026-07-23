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
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	media_assetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestDeleteMediaAssetHandler(t *testing.T) {
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
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "screenshots/test.png",
					}, nil).
					Twice()
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
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.Anything).
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
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				stepID := uuid.New()
				guideID := uuid.New()
				mockMediaAssetsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: "screenshots/test.png",
					}, nil).
					Twice()
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
				mockMediaAssetsRepo.On("Delete", mock.Anything, mock.Anything).
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
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			maSvc := media_assetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo, (*interfaces.MediaAssetHooks)(nil))
			stepsSvc := stepsservice.NewStepsService(nil, mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", nil, (*interfaces.StepHooks)(nil))
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, nil, nil, nil, nil, nil)
			uc := usecases.NewMediaAssetsUseCase(mockAuthz, maSvc, stepsSvc, guidesSvc)
			handler := handlersmediaassets.NewDeleteMediaAssetHandler(appConfig, uc)

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
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
