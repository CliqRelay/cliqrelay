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

func TestStarGuideHandler(t *testing.T) {
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
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockAuthz := new(tests.MockAuthorizationService)

			if tt.name == "success" || tt.name == "already starred (idempotent)" {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Guide Title",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStarredRepo.On("Star", mock.Anything, mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(nil).
					Once()
				mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			} else {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID).
					Return(&models.Guide{
						ID:        uuid.MustParse(guideID),
						CreatorID: "test-user-123",
						Title:     "Guide Title",
						Status:    models.StatusDraft,
					}, nil).
					Twice()
				mockStarredRepo.On("Star", mock.Anything, mock.Anything, "test-user-123", uuid.MustParse(guideID)).
					Return(assert.AnError).
					Once()
				mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			}

			starredSvc := starredguidesservice.NewStarredGuidesService(mockStarredRepo, mockGuidesRepo)
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, mockStarredRepo, nil, nil, nil, nil)
			uc := usecases.NewGuidesUseCase(mockAuthz, guidesSvc, starredSvc)
			handler := handlersguides.NewStarGuideHandler(appConfig, uc)

			req := tests.NewHandlerRequest(t, http.MethodPost, path, nil)
			req.Req.SetPathValue("id", guideID)
			req.Req.SetPathValue("workspaceId", uuid.New().String())

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedBody != "" {
				tests.AssertResponseContains(t, req.ReqCtx, "message", tt.expectedBody)
			}
		})
	}
}
