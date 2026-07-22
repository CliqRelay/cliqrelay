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
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
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
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockAuthz := new(tests.MockAuthorizationService)

			mockGuidesRepo.On("GetByID", mock.Anything, guideID).
				Return(&models.Guide{
					ID:        uuid.MustParse(guideID),
					CreatorID: "test-user-123",
					Title:     "Guide Title",
					Status:    models.StatusDraft,
				}, nil).
				Twice()
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)

			if tt.name == "success" || tt.name == "not starred (safe)" {
				mockStarredRepo.On("Unstar", mock.Anything, mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(nil).
					Once()
			} else {
				mockStarredRepo.On("Unstar", mock.Anything, mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(assert.AnError).
					Once()
			}

			starredSvc := starredguidesservice.NewStarredGuidesService(mockStarredRepo, mockGuidesRepo)
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, mockStarredRepo, nil, nil, nil, nil)
			uc := usecases.NewGuidesUseCase(mockAuthz, guidesSvc, starredSvc)
			handler := handlersguides.NewUnstarGuideHandler(appConfig, uc)

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
