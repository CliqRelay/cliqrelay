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
	"github.com/CliqRelay/cliqrelay/internal/types"
)

func TestGetAllMediaAssetsHandler(t *testing.T) {
	t.Parallel()

	appConfig := &internal.AppConfig{}

	cases := []struct {
		name           string
		stepID         string
		setup          func(*tests.MockMediaAssetsRepository, *tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedLen    int
	}{
		{
			name:   "success",
			stepID: uuid.New().String(),
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
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: "screenshots/one.png"},
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: "screenshots/two.png"},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name:   "empty list",
			stepID: uuid.New().String(),
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
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name:   "service error",
			stepID: uuid.New().String(),
			setup: func(mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedLen:    0,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			svc := media_assetsservice.NewMediaAssetsService(mockMediaAssetsRepo, mockStepsRepo, mockGuidesRepo)
			handler := handlersmediaassets.NewGetAllMediaAssetsHandler(appConfig, svc)

			path := "/api/v1/media-assets?stepId=" + tt.stepID
			req := tests.NewHandlerRequest(t, http.MethodGet, path, nil)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllMediaAssetsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.MediaAssets, tt.expectedLen)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, assert.AnError.Error())
			}

			mockMediaAssetsRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
