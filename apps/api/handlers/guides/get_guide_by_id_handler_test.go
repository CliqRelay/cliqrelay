package guides_test

import (
	"net/http"
	"testing"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetGuideHandler(t *testing.T) {
	t.Parallel()

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
			expectedBody:   "Found Guide",
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
						CreatorID: new("test-user-123"),
						Title:     "Found Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			} else {
				mockRepo.On("GetByID", mock.Anything, guideID).
					Return(nil, assert.AnError).
					Once()
			}

			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, (*interfaces.GuideHooks)(nil))
			uc := usecases.NewGuidesUseCase(mockAuthz, svc, nil, nil)
			handler := handlersguides.NewGetGuideByIDHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, path, nil)
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

func TestGetGuideHandler_AnonymousVisitor(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name            string
		visibility      models.Visibility
		authzErr        error
		expectedStatus  int
		expectedTitle   string
		expectedMessage string
	}{
		{
			name:           "public guide is readable",
			visibility:     models.VisibilityPublic,
			expectedStatus: http.StatusOK,
			expectedTitle:  "Anonymous Guide",
		},
		{
			name:            "team guide is denied",
			visibility:      models.VisibilityTeam,
			authzErr:        constants.ErrUnauthorized,
			expectedStatus:  http.StatusUnauthorized,
			expectedMessage: constants.ErrUnauthorized.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			guideID := uuid.New().String()

			mockRepo := new(tests.MockGuidesRepository)
			mockRepo.On("GetByID", mock.Anything, guideID).
				Return(&models.Guide{
					ID:         uuid.MustParse(guideID),
					Title:      "Anonymous Guide",
					Status:     models.StatusPublished,
					Visibility: tt.visibility,
				}, nil).
				Once()

			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanReadGuide", mock.Anything, (*authulamodels.Actor)(nil), mock.Anything, mock.Anything).Return(tt.authzErr)

			mockStarredRepo := new(tests.MockStarredGuidesRepository)

			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, nil, (*interfaces.GuideHooks)(nil))
			starredSvc := starredguidesservice.NewStarredGuidesService(mockStarredRepo, mockRepo)
			uc := usecases.NewGuidesUseCase(mockAuthz, svc, starredSvc, nil)
			handler := handlersguides.NewGetGuideByIDHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/guides/"+guideID, nil)
			req.ReqCtx.Actor = nil
			req.Req.SetPathValue("id", guideID)

			// Act
			handler.Handle()(req.W, req.Req)

			// Assert
			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)
			if tt.expectedTitle != "" {
				tests.AssertResponseContains(t, req.ReqCtx, "guide.title", tt.expectedTitle)
			}
			if tt.expectedMessage != "" {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMessage)
			}
			mockRepo.AssertExpectations(t)
			mockAuthz.AssertExpectations(t)
			mockStarredRepo.AssertNotCalled(t, "IsStarred", mock.Anything, mock.Anything, mock.Anything)
		})
	}
}
