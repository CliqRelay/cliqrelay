package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestUpdateGuideHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		guideID        string
		payload        any
		rawBody        []byte
		expectedStatus int
		expectedBody   string
	}{
		{
			name:    "success",
			guideID: uuid.New().String(),
			payload: types.UpdateGuideRequest{
				Title: new("Updated Title"),
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "Updated Title",
		},
		{
			name:           "invalid JSON body",
			guideID:        uuid.New().String(),
			rawBody:        []byte("{invalid json}"),
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "invalid character",
		},
		{
			name:    "validation error",
			guideID: uuid.New().String(),
			payload: types.UpdateGuideRequest{
				Title: new("this title is way too long and should exceed the maximum allowed length of 255 characters which will trigger a validation error when the handler processes the request and returns an unprocessable entity response to the client indicating that the provided data is invalid and cannot be used to update the guide in the database this is a very long string that keeps going and going and going and going and going and going and going and going and going and going and going and going and going and going and going"),
			},
			expectedStatus: http.StatusUnprocessableEntity,
			expectedBody:   "failed on the 'lte' tag",
		},
		{
			name:    "service error",
			guideID: uuid.New().String(),
			payload: types.UpdateGuideRequest{
				Title: new("Test"),
			},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			guideID := tt.guideID
			path := "/api/v1/guides/" + guideID

			mockRepo := new(tests.MockGuidesRepository)

			switch tt.name {
			case "success":
				mockRepo.On("Update", mock.Anything, "test-user-123", mock.AnythingOfType("*types.UpdateGuideDTO")).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Updated Title",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			case "service error":
				mockRepo.On("Update", mock.Anything, "test-user-123", mock.AnythingOfType("*types.UpdateGuideDTO")).
					Return(nil, assert.AnError).
					Once()
			}

			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, nil)
			handler := handlersguides.NewUpdateGuideHandler(appConfig, svc)

			var req tests.HandlerTestRequest
			if tt.rawBody != nil {
				req = tests.NewRawHandlerRequest(t, http.MethodPut, path, tt.rawBody)
			} else {
				req = tests.NewHandlerRequest(t, http.MethodPut, path, tt.payload)
			}
			req.Req.SetPathValue("id", guideID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				if tt.expectedStatus == http.StatusOK {
					tests.AssertResponseContains(t, req.ReqCtx, "guide.title", tt.expectedBody)
				} else {
					tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedBody)
				}
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
