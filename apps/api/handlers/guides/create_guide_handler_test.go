package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestCreateGuideHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		payload        any
		rawBody        []byte
		setup          func(*tests.MockGuidesRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "success",
			payload: types.CreateGuideRequest{
				Title:       "Test Guide",
				Description: new("A description"),
			},
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateGuideDTO")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
			expectedStatus: http.StatusCreated,
			expectedBody:   "Test Guide",
		},
		{
			name:           "invalid JSON body",
			rawBody:        []byte("{invalid json}"),
			setup:          func(mockRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name: "validation error",
			payload: types.CreateGuideRequest{
				Title: "",
			},
			setup:          func(mockRepo *tests.MockGuidesRepository) {},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "failed on the 'required' tag",
		},
		{
			name: "service error",
			payload: types.CreateGuideRequest{
				Title: "Test",
			},
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateGuideDTO")).
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

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanCreateGuide", mock.Anything, mock.AnythingOfType("*models.Identity")).Return(nil)
			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, nil, mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))
			handler := handlersguides.NewCreateGuideHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPost, "/api/v1/guides", tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPost, "/api/v1/guides", tt.payload)
			}

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus < http.StatusBadRequest {
					tests.AssertResponseContains(t, req.ReqCtx, "guide.title", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
