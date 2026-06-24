package steps_test

import (
	"log/slog"
	"net/http"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/internal"
	handlerssteps "github.com/CliqRelay/cliqrelay/internal/handlers/steps"
	"github.com/CliqRelay/cliqrelay/internal/models"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/tests"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

func TestReorderStepsHandler(t *testing.T) {
	t.Parallel()

	appConfig := &internal.AppConfig{}

	cases := []struct {
		name           string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
		expectedLen    int
	}{
		{
			name: "success",
			payload: types.ReorderStepsRequest{
				GuideID:      uuid.New(),
				TargetStepID: uuid.New().String(),
				PrevStepID:   new(uuid.New().String()),
				NextStepID:   new(uuid.New().String()),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "b0", Action: new(models.StepActionInput)},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name:           "invalid JSON body",
			rawBody:        []byte("{invalid json}"),
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name: "validation error",
			payload: types.ReorderStepsRequest{
				GuideID:      uuid.Nil,
				TargetStepID: "",
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "failed on the 'required' tag",
		},
		{
			name: "service error from guidesRepo.GetByID",
			payload: types.ReorderStepsRequest{
				GuideID:      uuid.New(),
				TargetStepID: uuid.New().String(),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
		{
			name: "service error from stepsRepo.Reorder",
			payload: types.ReorderStepsRequest{
				GuideID:      uuid.New(),
				TargetStepID: uuid.New().String(),
				PrevStepID:   new(uuid.New().String()),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
					Return([]*models.Step{}, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockStepsRepo, mockGuidesRepo)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger)
			handler := handlerssteps.NewReorderStepsHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPost, "/api/v1/steps/reorder", tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPost, "/api/v1/steps/reorder", tt.payload)
			}

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.ReorderStepsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Steps, tt.expectedLen)
			} else if tt.expectedBody != "" {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
