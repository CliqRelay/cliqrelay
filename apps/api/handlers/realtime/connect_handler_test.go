package realtime_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlers "github.com/CliqRelay/cliqrelay/handlers/realtime"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestConnectHandler(t *testing.T) {
	t.Parallel()

	teamID := uuid.New()

	cases := []struct {
		name           string
		query          string
		setup          func(*tests.MockAuthorizationService, *tests.MockRealtimeService)
		expectedStatus int
		expectedURL    string
		expectedMsg    string
	}{
		{
			name:  "returns a stream URL with a ticket",
			query: "?team_id=" + teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, svc *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, mock.Anything, teamID.String()).Return(nil)
				svc.On("IssueTicket", mock.Anything, "test-user-123", teamID).
					Return(&types.RealtimeTicket{Ticket: "tkt", ExpiresAt: time.Now()}, nil).Once()
			},
			expectedStatus: http.StatusOK,
			expectedURL:    "https://api.test/api/v1/realtime/stream?ticket=tkt",
		},
		{
			name:  "forbids non-members",
			query: "?team_id=" + teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, _ *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, mock.Anything, teamID.String()).Return(constants.ErrTeamAccessDenied)
			},
			expectedStatus: http.StatusForbidden,
			expectedMsg:    constants.ErrTeamAccessDenied.Error(),
		},
		{
			name:  "service error",
			query: "?team_id=" + teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, svc *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, mock.Anything, teamID.String()).Return(nil)
				svc.On("IssueTicket", mock.Anything, "test-user-123", teamID).Return(nil, assert.AnError).Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    assert.AnError.Error(),
		},
		{
			name:           "missing team id",
			query:          "",
			setup:          func(*tests.MockAuthorizationService, *tests.MockRealtimeService) {},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrTeamNotFound.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			authz := new(tests.MockAuthorizationService)
			svc := new(tests.MockRealtimeService)
			tt.setup(authz, svc)
			handler := handlers.NewConnectHandler(usecases.NewRealtimeUseCase(authz, svc, "https://api.test/api/v1/realtime/stream"))

			req := tests.NewRawHandlerRequest(t, http.MethodPost, "/api/v1/realtime/connect"+tt.query, nil)
			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)
			if tt.expectedStatus == http.StatusOK {
				var resp types.RealtimeConnectionResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, tt.expectedURL, resp.URL)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}
			svc.AssertExpectations(t)
		})
	}
}
