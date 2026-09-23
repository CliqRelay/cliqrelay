package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/types"
)

type RealtimeService interface {
	IssueTicket(ctx context.Context, userID string, teamID uuid.UUID) (*types.RealtimeTicket, error)
	RedeemTicket(ctx context.Context, ticket string) (*types.RealtimeTicketClaims, error)
	// Publish sends an event to the team's connected clients, or only to userIDs when any are given.
	Publish(ctx context.Context, teamID uuid.UUID, eventType string, data any, userIDs ...string) error
	// Subscribe streams the team's events until the returned close func is called.
	Subscribe(ctx context.Context, teamID uuid.UUID) (<-chan *types.RealtimeEvent, func() error, error)
}
