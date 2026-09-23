package realtime_test

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/events"
	handlers "github.com/CliqRelay/cliqrelay/handlers/realtime"
	realtimeservice "github.com/CliqRelay/cliqrelay/services/realtime"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

type streamFixture struct {
	server  *httptest.Server
	redis   *redis.Client
	service *realtimeservice.RealtimeService
	teamID  uuid.UUID
}

func newStreamFixture(t *testing.T) *streamFixture {
	t.Helper()
	client, _ := tests.NewTestRedis(t)
	svc := realtimeservice.NewRealtimeService(client, nil)
	uc := usecases.NewRealtimeUseCase(nil, svc, "")
	server := httptest.NewServer(handlers.NewStreamHandler(uc, "https://app.test"))
	t.Cleanup(server.Close)
	return &streamFixture{server: server, redis: client, service: svc, teamID: uuid.New()}
}

func (f *streamFixture) open(t *testing.T, ctx context.Context, userID string) (*http.Response, *bufio.Reader) {
	t.Helper()
	issued, err := f.service.IssueTicket(context.Background(), userID, f.teamID)
	require.NoError(t, err)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, f.server.URL+"?ticket="+issued.Ticket, nil)
	require.NoError(t, err)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	t.Cleanup(func() { _ = resp.Body.Close() })
	require.Equal(t, http.StatusOK, resp.StatusCode)

	reader := bufio.NewReader(resp.Body)
	line, err := reader.ReadString('\n')
	require.NoError(t, err)
	require.Equal(t, ": connected\n", line)
	_, _ = reader.ReadString('\n')
	return resp, reader
}

type item struct {
	ID string `json:"id"`
}

type published struct {
	eventType string
	id        string
	userIDs   []string
}

func (f *streamFixture) publish(t *testing.T, p published) {
	t.Helper()
	require.NoError(t, f.service.Publish(context.Background(), f.teamID, p.eventType, item{ID: p.id}, p.userIDs...))
}

func readFrame(t *testing.T, reader *bufio.Reader) (string, *item) {
	t.Helper()
	frame := make(chan []string, 1)
	go func() {
		var lines []string
		for {
			line, err := reader.ReadString('\n')
			if err != nil || line == "\n" {
				frame <- lines
				return
			}
			lines = append(lines, strings.TrimSuffix(line, "\n"))
		}
	}()

	select {
	case lines := <-frame:
		require.Len(t, lines, 2)
		var got item
		require.NoError(t, json.Unmarshal([]byte(strings.TrimPrefix(lines[1], "data: ")), &got))
		return lines[0], &got
	case <-time.After(2 * time.Second):
		t.Fatal("no frame received")
		return "", nil
	}
}

func TestStreamHandler_Handshake(t *testing.T) {
	t.Parallel()

	issueTicket := func(t *testing.T, f *streamFixture) string {
		t.Helper()
		issued, err := f.service.IssueTicket(context.Background(), "user-1", f.teamID)
		require.NoError(t, err)
		return issued.Ticket
	}

	cases := []struct {
		name            string
		ticket          func(*testing.T, *streamFixture) string
		expectedStatus  int
		expectedHeaders map[string]string
	}{
		{
			name:           "valid ticket opens the stream",
			ticket:         issueTicket,
			expectedStatus: http.StatusOK,
			expectedHeaders: map[string]string{
				"Content-Type":                "text/event-stream",
				"Cache-Control":               "no-cache",
				"X-Accel-Buffering":           "no",
				"Access-Control-Allow-Origin": "https://app.test",
			},
		},
		{
			name:           "unknown ticket is rejected",
			ticket:         func(*testing.T, *streamFixture) string { return "bogus" },
			expectedStatus: http.StatusUnauthorized,
			expectedHeaders: map[string]string{
				"Access-Control-Allow-Origin": "https://app.test",
			},
		},
		{
			name:           "missing ticket is rejected",
			ticket:         func(*testing.T, *streamFixture) string { return "" },
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "redeemed ticket is rejected",
			ticket: func(t *testing.T, f *streamFixture) string {
				ticket := issueTicket(t, f)
				_, err := f.service.RedeemTicket(context.Background(), ticket)
				require.NoError(t, err)
				return ticket
			},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := newStreamFixture(t)

			req, err := http.NewRequestWithContext(t.Context(), http.MethodGet, f.server.URL+"?ticket="+tt.ticket(t, f), nil)
			require.NoError(t, err)
			resp, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer func() { _ = resp.Body.Close() }()

			assert.Equal(t, tt.expectedStatus, resp.StatusCode)
			for header, want := range tt.expectedHeaders {
				assert.Equal(t, want, resp.Header.Get(header), header)
			}
		})
	}
}

func TestStreamHandler_Delivery(t *testing.T) {
	t.Parallel()

	teamWide := published{eventType: "activity", id: "team-wide"}
	forViewer := published{eventType: "activity", id: "for-viewer", userIDs: []string{"user-2", "user-1"}}
	forOthers := published{eventType: "activity", id: "for-others", userIDs: []string{"user-2"}}
	otherType := published{eventType: "guide", id: "other-type"}

	cases := []struct {
		name      string
		published []published
		expected  []published
	}{
		{
			name:      "team-wide event is delivered",
			published: []published{teamWide},
			expected:  []published{teamWide},
		},
		{
			name:      "event addressed to the viewer is delivered",
			published: []published{forViewer},
			expected:  []published{forViewer},
		},
		{
			name:      "event addressed to other users is skipped",
			published: []published{forOthers, teamWide},
			expected:  []published{teamWide},
		},
		{
			name:      "event type becomes the SSE event name",
			published: []published{otherType},
			expected:  []published{otherType},
		},
		{
			name:      "events arrive in publish order",
			published: []published{teamWide, otherType, forViewer},
			expected:  []published{teamWide, otherType, forViewer},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f := newStreamFixture(t)
			_, reader := f.open(t, t.Context(), "user-1")

			for _, p := range tt.published {
				f.publish(t, p)
			}

			for _, want := range tt.expected {
				event, got := readFrame(t, reader)
				assert.Equal(t, "event: "+want.eventType, event)
				assert.Equal(t, want.id, got.ID)
			}
		})
	}
}

func TestStreamHandler_ExitsOnClientDisconnect(t *testing.T) {
	t.Parallel()
	f := newStreamFixture(t)

	ctx, cancel := context.WithCancel(context.Background())
	f.open(t, ctx, "user-1")
	channel := events.RealtimeTeamChannel(f.teamID.String())

	subscribers := func() int64 {
		counts, err := f.redis.PubSubNumSub(context.Background(), channel).Result()
		require.NoError(t, err)
		return counts[channel]
	}
	require.Equal(t, int64(1), subscribers())

	cancel()

	assert.Eventually(t, func() bool { return subscribers() == 0 }, 2*time.Second, 20*time.Millisecond)
}
