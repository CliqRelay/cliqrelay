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
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestDeleteGuideHandler(t *testing.T) {
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
			expectedBody:   "Deleted Guide",
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
			path := "/api/v1/guides/" + guideID

			mockRepo := new(tests.MockGuidesRepository)
			mockAuthz := new(tests.MockAuthorizationService)

			if tt.expectedStatus == http.StatusOK {
				mockRepo.On("GetByID", mock.Anything, guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Existing Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockRepo.On("Delete", mock.Anything, guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Deleted Guide",
						Status:    models.GuideStatus("deleted"),
					}, nil).
					Once()
				mockAuthz.On("CanDeleteGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			} else {
				mockRepo.On("GetByID", mock.Anything, guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Existing Guide",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockRepo.On("Delete", mock.Anything, guideID).
					Return(nil, assert.AnError).
					Once()
				mockAuthz.On("CanDeleteGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			}

			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, nil, (*interfaces.GuideHooks)(nil))
			uc := usecases.NewGuidesUseCase(mockAuthz, svc, nil)
			handler := handlersguides.NewDeleteGuideHandler(appConfig, uc)

			req := tests.NewHandlerRequest(t, http.MethodDelete, path, nil)
			req.Req.SetPathValue("id", guideID)
			req.Req.SetPathValue("workspaceId", uuid.New().String())

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
