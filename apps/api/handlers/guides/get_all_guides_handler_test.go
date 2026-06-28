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

func TestGetAllGuidesHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		path           string
		setup          func(*tests.MockGuidesRepository, *tests.MockStarredGuidesRepository)
		expectedStatus int
		expectedLen    int
		expectedMsg    string
	}{
		{
			name: "success",
			path: "/api/v1/guides",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{
						{Guide: models.Guide{ID: uuid.New(), CreatorID: "test-user-123", Title: "Guide 1", Status: models.StatusDraft}},
						{Guide: models.Guide{ID: uuid.New(), CreatorID: "test-user-123", Title: "Guide 2", Status: models.StatusDraft}},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name: "empty list",
			path: "/api/v1/guides",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name: "service error",
			path: "/api/v1/guides",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{}, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    assert.AnError.Error(),
		},
		{
			name: "status archived",
			path: "/api/v1/guides?status=archived",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{
						{Guide: models.Guide{ID: uuid.New(), CreatorID: "test-user-123", Title: "Archived Guide", Status: models.StatusArchived}},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    1,
		},
		{
			name: "status deleted",
			path: "/api/v1/guides?status=deleted",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{
						{Guide: models.Guide{ID: uuid.New(), CreatorID: "test-user-123", Title: "Deleted Guide", Status: models.StatusDeleted}},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    1,
		},
		{
			name: "status invalid",
			path: "/api/v1/guides?status=invalid",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
			},
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    "invalid status: invalid",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockStarredRepo := new(tests.MockStarredGuidesRepository)
			tt.setup(mockGuidesRepo, mockStarredRepo)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("GuideListFilter", mock.Anything, mock.AnythingOfType("*models.Identity")).Return(&types.GuideFilter{}, nil)
			svc := guidesservice.NewGuidesService(mockGuidesRepo, mockStarredRepo, nil, nil, nil, mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))
			handler := handlersguides.NewGetAllGuidesHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodGet, tt.path, nil)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllGuidesResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Guides, tt.expectedLen)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}

			mockStarredRepo.AssertExpectations(t)
		})
	}
}
