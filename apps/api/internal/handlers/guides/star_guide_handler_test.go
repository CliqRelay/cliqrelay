package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/internal"
	handlersguides "github.com/CliqRelay/cliqrelay/internal/handlers/guides"
	starredguidesservice "github.com/CliqRelay/cliqrelay/internal/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/internal/tests"
)

func TestStarGuideHandler(t *testing.T) {
	t.Parallel()

	appConfig := &internal.AppConfig{}

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
			expectedBody:   "Guide starred successfully",
		},
		{
			name:           "already starred (idempotent)",
			guideID:        uuid.New().String(),
			expectedStatus: http.StatusOK,
			expectedBody:   "Guide starred successfully",
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

			if tt.name == "success" || tt.name == "already starred (idempotent)" {
				mockStarredRepo.On("Star", mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(nil).
					Once()
			} else {
				mockStarredRepo.On("Star", mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(assert.AnError).
					Once()
			}

			svc := starredguidesservice.NewStarredGuidesService(mockStarredRepo)
			handler := handlersguides.NewStarGuideHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodPost, path, nil)
			req.Req.SetPathValue("id", guideID)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				tests.AssertResponseContains(t, req.ReqCtx, "message", tt.expectedBody)
			}
		})
	}
}
