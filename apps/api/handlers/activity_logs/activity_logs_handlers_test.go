package activitylogs_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlers "github.com/CliqRelay/cliqrelay/handlers/activity_logs"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestListActivityLogsHandler(t *testing.T) {
	t.Parallel()

	teamID := uuid.New()

	cases := []struct {
		name           string
		query          string
		setup          func(*tests.MockAuthorizationService, *tests.MockActivityLogsService)
		expectedStatus int
		expectedLen    int
		expectedMsg    string
	}{
		{
			name:  "returns the team's activity",
			query: "?team_id=" + teamID.String() + "&limit=5",
			setup: func(authz *tests.MockAuthorizationService, svc *tests.MockActivityLogsService) {
				authz.On("GuideListFilter", mock.Anything, mock.Anything, teamID.String()).Return(&types.GuideFilter{}, nil)
				svc.On("List", mock.Anything, teamID, "test-user-123", 5).
					Return([]*models.ActivityLog{{ID: uuid.New()}, {ID: uuid.New()}}, nil).Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name:  "forbids non-members",
			query: "?team_id=" + teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, _ *tests.MockActivityLogsService) {
				authz.On("GuideListFilter", mock.Anything, mock.Anything, teamID.String()).Return(nil, constants.ErrTeamAccessDenied)
			},
			expectedStatus: http.StatusForbidden,
			expectedMsg:    constants.ErrTeamAccessDenied.Error(),
		},
		{
			name:           "missing team id",
			query:          "",
			setup:          func(*tests.MockAuthorizationService, *tests.MockActivityLogsService) {},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrTeamNotFound.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			authz := new(tests.MockAuthorizationService)
			svc := new(tests.MockActivityLogsService)
			tt.setup(authz, svc)
			handler := handlers.NewListActivityLogsHandler(usecases.NewActivityLogsUseCase(authz, svc))

			req := tests.NewRawHandlerRequest(t, http.MethodGet, "/api/v1/activity-logs"+tt.query, nil)
			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)
			if tt.expectedStatus == http.StatusOK {
				var resp types.ListActivityLogsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Data, tt.expectedLen)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}
			svc.AssertExpectations(t)
		})
	}
}
