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
	"github.com/CliqRelay/cliqrelay/types"
)

func TestUpdateStepHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		stepID         string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockStepsRepository, *tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
		responseKey    string
	}{
		{
			name:   "success",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Action: new(models.StepActionNavigation),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionNavigation),
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "navigation",
		},
		{
			name:   "updates canvas content",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Type: new(models.StepType(models.StepTypeCanvas)),
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
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
			expectedStatus: http.StatusOK,
			expectedBody:   "canvas",
			responseKey:    "step.type",
		},
		{
			name:           "invalid JSON body",
			stepID:         uuid.New().String(),
			rawBody:        []byte("{invalid json}"),
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name:   "validation error",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Action: new(models.StepAction("invalid_action")),
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "failed on the 'oneof' tag",
		},
		{
			name:   "canvas step with action rejected",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Type:   new(models.StepType(models.StepTypeCanvas)),
				Action: new(models.StepActionClick),
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "action is not applicable for canvas steps",
		},
		{
			name:   "interaction step with canvas_content rejected",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Type: new(models.StepType(models.StepTypeInteraction)),
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup:          func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "canvas_content is not applicable for interaction steps",
		},
		{
			name:   "service error",
			stepID: uuid.New().String(),
			payload: types.UpdateStepRequest{
				Action: new(models.StepActionClick),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, "test-user-123", guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
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

			stepID := tt.stepID
			path := "/api/v1/steps/" + stepID

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			tt.setup(mockStepsRepo, mockGuidesRepo)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything).Return(nil)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger, mockIdentity, mockAuthz, (*interfaces.StepHooks)(nil))
			handler := handlerssteps.NewUpdateStepHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPatch, path, tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPatch, path, tt.payload)
			}
			req.Req.SetPathValue("id", stepID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
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
