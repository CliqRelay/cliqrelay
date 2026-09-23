package usecases_test

import (
	"context"
	"testing"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

const testStreamURL = "https://api.test/api/v1/realtime/stream"

func TestRealtimeUseCase_Connect(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.Actor{ID: "user-1"}
	teamID := uuid.New()
	expiresAt := time.Now()

	cases := []struct {
		name          string
		teamID        string
		setup         func(*tests.MockAuthorizationService, *tests.MockRealtimeService)
		wantURL       string
		wantExpiresAt time.Time
		wantErr       error
	}{
		{
			name:   "returns the stream URL with an escaped ticket for members",
			teamID: teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, svc *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, actor, teamID.String()).Return(nil).Once()
				svc.On("IssueTicket", mock.Anything, "user-1", teamID).
					Return(&types.RealtimeTicket{Ticket: "a+b/c", ExpiresAt: expiresAt}, nil).Once()
			},
			wantURL:       testStreamURL + "?ticket=a%2Bb%2Fc",
			wantExpiresAt: expiresAt,
		},
		{
			name:   "refuses non-members",
			teamID: teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, _ *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, actor, teamID.String()).Return(constants.ErrTeamAccessDenied).Once()
			},
			wantErr: constants.ErrTeamAccessDenied,
		},
		{
			name:   "returns a ticket issuing failure",
			teamID: teamID.String(),
			setup: func(authz *tests.MockAuthorizationService, svc *tests.MockRealtimeService) {
				authz.On("CanAccessTeam", mock.Anything, actor, teamID.String()).Return(nil).Once()
				svc.On("IssueTicket", mock.Anything, "user-1", teamID).Return(nil, assert.AnError).Once()
			},
			wantErr: assert.AnError,
		},
		{
			name:    "rejects an invalid team id",
			teamID:  "nope",
			setup:   func(*tests.MockAuthorizationService, *tests.MockRealtimeService) {},
			wantErr: constants.ErrTeamNotFound,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			authz := new(tests.MockAuthorizationService)
			svc := new(tests.MockRealtimeService)
			tt.setup(authz, svc)

			got, err := usecases.NewRealtimeUseCase(authz, svc, testStreamURL).Connect(context.Background(), actor, tt.teamID)

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantURL, got.URL)
				assert.Equal(t, tt.wantExpiresAt, got.ExpiresAt)
			}
			authz.AssertExpectations(t)
			svc.AssertExpectations(t)
		})
	}
}
