package steps_test

import (
	"log/slog"
	"net/http"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlerssteps "github.com/CliqRelay/cliqrelay/handlers/steps"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestDeleteStepHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		stepID         string
		setup          func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:   "success",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "Step deleted successfully",
		},
		{
			name:   "service error",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stepID := tt.stepID
			path := "/api/v1/steps/" + stepID

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			tt.setup(mockStepsRepo, mockMediaAssetsRepo)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, nil, new(tests.MockPresignService), new(tests.MockStorageService), mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))
			handler := handlerssteps.NewDeleteStepHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodDelete, path, nil)
			req.Req.SetPathValue("id", stepID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
					tests.AssertResponseContains(t, req.ReqCtx, "message", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}
