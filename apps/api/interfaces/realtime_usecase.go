package interfaces

import (
	"context"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/types"
)

type RealtimeUseCase interface {
	Connect(ctx context.Context, actor *authulamodels.Actor, teamID string) (*types.RealtimeConnectionResponse, error)
	RedeemTicket(ctx context.Context, ticket string) (*types.RealtimeTicketClaims, error)
	Subscribe(ctx context.Context, teamID uuid.UUID) (<-chan *types.RealtimeEvent, func() error, error)
}
