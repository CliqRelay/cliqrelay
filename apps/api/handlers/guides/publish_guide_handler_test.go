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
)

func TestPublishGuideHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		guideID        string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "success",
			guideID:        uuid.New().String(),
			expectedStatus: http.StatusOK,
			expectedBody:   "Published Guide",
		},
		{
			name:           "service error",
			guideID:        uuid.New().String(),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			guideID := tt.guideID
			path := "/api/v1/guides/" + guideID + "/publish"

			mockRepo := new(tests.MockGuidesRepository)

			if tt.expectedStatus == http.StatusOK {
				mockRepo.On("GetByID", mock.Anything, "test-user-123", guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Draft Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, "test-user-123", guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Published Guide",
						Status:    models.StatusPublished,
					}, nil).
					Once()
			} else {
				mockRepo.On("GetByID", mock.Anything, "test-user-123", guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Draft Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, "test-user-123", guideID).
					Return(nil, assert.AnError).
					Once()
			}

			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, nil, (*interfaces.GuideHooks)(nil))
			handler := handlersguides.NewPublishGuideHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodPost, path, nil)
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
