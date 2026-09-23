package types

import (
	"encoding/json"
	"slices"
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/validator"
)

// Realtime event types, sent to clients as the SSE event name.
const (
	RealtimeEventActivity = "activity"
)

type ConnectRealtimeQueryParams struct {
	TeamID string `query:"team_id" validate:"required,uuid"`
}

func (r *ConnectRealtimeQueryParams) Validate() error {
	return validator.Validate.Struct(r)
}

// RealtimeConnectionResponse carries a stream URL with a single-use ticket
// already embedded, so clients connect to it as-is.
type RealtimeConnectionResponse struct {
	URL       string    `json:"url" required:"true" nullable:"false"`
	ExpiresAt time.Time `json:"expires_at" required:"true" nullable:"false"`
}

type RealtimeTicket struct {
	Ticket    string
	ExpiresAt time.Time
}

type RealtimeTicketClaims struct {
	UserID string    `json:"user_id"`
	TeamID uuid.UUID `json:"team_id"`
}

// RealtimeEvent is the envelope fanned out on a team's realtime channel.
type RealtimeEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
	// UserIDs limits delivery to these team members; empty means the whole team.
	UserIDs []string `json:"user_ids,omitempty"`
}

func (e *RealtimeEvent) VisibleTo(userID string) bool {
	return len(e.UserIDs) == 0 || slices.Contains(e.UserIDs, userID)
}
