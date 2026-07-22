package steps_test

import (
	"log/slog"
	"net/http"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlerssteps "github.com/CliqRelay/cliqrelay/handlers/steps"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func testRedisClient() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
}

func TestCreateStepHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
		responseKey    string // JSON key for success response check, defaults to "step.action"
	}{
		{
			name: "success",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeInteraction,
				Action:      new(models.StepActionClick),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
			},
			expectedStatus: http.StatusCreated,
			expectedBody:   "click",
		},
		{
			name: "success with canvas content",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeCanvas,
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Type:      models.StepTypeCanvas,
						CanvasContent: &models.StepCanvasContent{
							Type: models.StepCanvasTypeCallout,
						},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusCreated,
			expectedBody:   "canvas",
			responseKey:    "step.type",
		},
		{
			name: "success with insert_before_step_id",
			payload: types.CreateStepRequest{
				WorkspaceID:        uuid.New(),
				GuideID:            uuid.New(),
				Type:               models.StepTypeInteraction,
				Action:             new(models.StepActionClick),
				InsertBeforeStepID: new(uuid.New().String()),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
			},
			expectedStatus: http.StatusCreated,
			expectedBody:   "click",
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
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.Nil,
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "failed on the 'required' tag",
		},
		{
			name: "canvas step with action rejected",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeCanvas,
				Action:      new(models.StepActionClick),
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "action is not applicable for canvas steps",
		},
		{
			name: "canvas step with url rejected",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeCanvas,
				URL:         new("https://example.com"),
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "url is not applicable for canvas steps",
		},
		{
			name: "interaction step with canvas_content rejected",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeInteraction,
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "canvas_content is not applicable for interaction steps",
		},
		{
			name: "guide not found",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeInteraction,
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "guide not found",
		},
		{
			name: "service error",
			payload: types.CreateStepRequest{
				WorkspaceID: uuid.New(),
				GuideID:     uuid.New(),
				Type:        models.StepTypeInteraction,
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
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

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockStepsRepo, mockGuidesRepo)
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger, (*interfaces.StepHooks)(nil))
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, nil, nil, nil, nil, nil)
			uc := usecases.NewStepsUseCase(mockAuthz, svc, guidesSvc)
			handler := handlerssteps.NewCreateStepHandler(appConfig, uc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPost, "/api/v1/steps", tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPost, "/api/v1/steps", tt.payload)
			}

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusCreated {
					key := tt.responseKey
					if key == "" {
						key = "step.action"
					}
					tests.AssertResponseContains(t, req.ReqCtx, key, tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
