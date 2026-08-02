package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/interfaces"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetGuidesCountHandler(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name           string
		teamID         string
		orgID          string
		setup          func(*tests.MockGuidesRepository, *tests.MockAuthorizationService)
		expectedStatus int
		expectedCount  int
		expectedMsg    string
	}{
		{
			name:   "team count success",
			teamID: uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilter", mock.Anything, mock.Anything, mock.Anything).
					Return(&types.GuideFilter{}, nil).
					Once()
				mockGuidesRepo.On("GetCount", mock.Anything, mock.Anything).
					Return(4, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedCount:  4,
		},
		{
			name:   "organization count success",
			orgID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilterByOrganization", mock.Anything, mock.Anything, mock.Anything).
					Return(&types.GuideFilter{}, nil).
					Once()
				mockGuidesRepo.On("GetCount", mock.Anything, mock.Anything).
					Return(5, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedCount:  5,
		},
		{
			name: "missing scope param",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
			},
			expectedStatus: http.StatusBadRequest,
			expectedMsg:    "either team_id or organization_id is required",
		},
		{
			name:   "both scope params provided",
			teamID: uuid.New().String(),
			orgID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
			},
			expectedStatus: http.StatusBadRequest,
			expectedMsg:    "provide only one of team_id or organization_id",
		},
		{
			name:   "organization not found",
			orgID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilterByOrganization", mock.Anything, mock.Anything, mock.Anything).
					Return(nil, constants.ErrOrganizationNotFound).
					Once()
			},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrOrganizationNotFound.Error(),
		},
		{
			name:   "organization access denied",
			orgID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilterByOrganization", mock.Anything, mock.Anything, mock.Anything).
					Return(nil, constants.ErrOrganizationAccessDenied).
					Once()
			},
			expectedStatus: http.StatusForbidden,
			expectedMsg:    constants.ErrOrganizationAccessDenied.Error(),
		},
		{
			name:   "team access denied",
			teamID: uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilter", mock.Anything, mock.Anything, mock.Anything).
					Return(nil, constants.ErrTeamAccessDenied).
					Once()
			},
			expectedStatus: http.StatusForbidden,
			expectedMsg:    constants.ErrTeamAccessDenied.Error(),
		},
		{
			name:   "service error",
			orgID:  uuid.New().String(),
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockAuthz *tests.MockAuthorizationService) {
				mockAuthz.On("GuideListFilterByOrganization", mock.Anything, mock.Anything, mock.Anything).
					Return(&types.GuideFilter{}, nil).
					Once()
				mockGuidesRepo.On("GetCount", mock.Anything, mock.Anything).
					Return(0, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockAuthz := new(tests.MockAuthorizationService)
			tt.setup(mockGuidesRepo, mockAuthz)
			svc := guidesservice.NewGuidesService(mockGuidesRepo, nil, nil, nil, (*interfaces.GuideHooks)(nil))
			uc := usecases.NewGuidesUseCase(mockAuthz, svc, nil, nil)
			handler := handlersguides.NewGetGuidesCountHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/guides/count", nil)

			q := req.Req.URL.Query()
			if tt.teamID != "" {
				q.Set("team_id", tt.teamID)
			}
			if tt.orgID != "" {
				q.Set("organization_id", tt.orgID)
			}
			req.Req.URL.RawQuery = q.Encode()

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetGuidesCountResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, tt.expectedCount, resp.Count)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}

			mockGuidesRepo.AssertExpectations(t)
			mockAuthz.AssertExpectations(t)
		})
	}
}
