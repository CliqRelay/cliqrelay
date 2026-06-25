package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestUnstarGuideHandler(t *testing.T) {
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
			expectedBody:   "Guide unstarred successfully",
		},
		{
			name:           "not starred (safe)",
			guideID:        uuid.New().String(),
			expectedStatus: http.StatusOK,
			expectedBody:   "Guide unstarred successfully",
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
			path := "/api/v1/guides/" + guideID + "/star"

			mockStarredRepo := new(tests.MockStarredGuidesRepository)

			if tt.name == "success" || tt.name == "not starred (safe)" {
				mockStarredRepo.On("Unstar", mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(nil).
					Once()
			} else {
				mockStarredRepo.On("Unstar", mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(assert.AnError).
					Once()
			}

			svc := starredguidesservice.NewStarredGuidesService(mockStarredRepo)
			handler := handlersguides.NewUnstarGuideHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodDelete, path, nil)
			req.Req.SetPathValue("id", guideID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				tests.AssertResponseContains(t, req.ReqCtx, "message", tt.expectedBody)
			}
		})
	}
}
