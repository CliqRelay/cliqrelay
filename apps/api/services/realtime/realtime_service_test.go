package realtime_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/services/realtime"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestRealtimeService_StreamTickets(t *testing.T) {
	t.Parallel()

	client, mr := tests.NewTestRedis(t)
	svc := realtime.NewRealtimeService(client, nil)
	teamID := uuid.New()

	issued, err := svc.IssueTicket(context.Background(), "user-1", teamID)
	require.NoError(t, err)
	assert.NotEmpty(t, issued.Ticket)
	assert.WithinDuration(t, time.Now().Add(realtime.StreamTicketTTL), issued.ExpiresAt, 2*time.Second)
	assert.Equal(t, realtime.StreamTicketTTL, mr.TTL("realtime:ticket:"+issued.Ticket))

	claims, err := svc.RedeemTicket(context.Background(), issued.Ticket)
	require.NoError(t, err)
	assert.Equal(t, "user-1", claims.UserID)
	assert.Equal(t, teamID, claims.TeamID)

	_, err = svc.RedeemTicket(context.Background(), issued.Ticket)
	assert.ErrorIs(t, err, constants.ErrInvalidStreamTicket, "tickets are single-use")

	_, err = svc.RedeemTicket(context.Background(), "")
	assert.ErrorIs(t, err, constants.ErrInvalidStreamTicket)
}

func TestRealtimeService_PublishSubscribe(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		userIDs []string
	}{
		{name: "team-wide event"},
		{name: "event addressed to specific users", userIDs: []string{"user-1", "user-2"}},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client, _ := tests.NewTestRedis(t)
			svc := realtime.NewRealtimeService(client, nil)
			teamID := uuid.New()

			feed, closeFeed, err := svc.Subscribe(context.Background(), teamID)
			require.NoError(t, err)

			require.NoError(t, svc.Publish(context.Background(), teamID, types.RealtimeEventActivity, map[string]string{"id": "a"}, tt.userIDs...))

			select {
			case got := <-feed:
				assert.Equal(t, types.RealtimeEventActivity, got.Type)
				assert.JSONEq(t, `{"id":"a"}`, string(got.Data))
				assert.Equal(t, tt.userIDs, got.UserIDs)
			case <-time.After(time.Second):
				t.Fatal("no event received")
			}

			require.NoError(t, closeFeed())
			_, open := <-feed
			assert.False(t, open)
		})
	}
}

func TestRealtimeService_SubscribeIsScopedToTheTeam(t *testing.T) {
	t.Parallel()

	client, _ := tests.NewTestRedis(t)
	svc := realtime.NewRealtimeService(client, nil)
	teamID := uuid.New()

	feed, closeFeed, err := svc.Subscribe(context.Background(), teamID)
	require.NoError(t, err)
	t.Cleanup(func() { _ = closeFeed() })

	require.NoError(t, svc.Publish(context.Background(), uuid.New(), types.RealtimeEventActivity, nil))

	select {
	case got := <-feed:
		t.Fatalf("received another team's event: %+v", got)
	case <-time.After(100 * time.Millisecond):
	}
}
