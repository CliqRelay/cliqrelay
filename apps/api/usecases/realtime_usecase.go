package usecases

import (
	"context"
	"net/url"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type RealtimeUseCase struct {
	authzService    interfaces.AuthorizationService
	realtimeService interfaces.RealtimeService
	streamURL       string
}

func NewRealtimeUseCase(authzService interfaces.AuthorizationService, realtimeService interfaces.RealtimeService, streamURL string) *RealtimeUseCase {
	return &RealtimeUseCase{authzService: authzService, realtimeService: realtimeService, streamURL: streamURL}
}

func (uc *RealtimeUseCase) Connect(ctx context.Context, actor *authulamodels.Actor, teamID string) (*types.RealtimeConnectionResponse, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, constants.ErrTeamNotFound
	}

	if err := uc.authzService.CanAccessTeam(ctx, actor, teamID); err != nil {
		return nil, err
	}

	ticket, err := uc.realtimeService.IssueTicket(ctx, actor.ID, parsedTeamID)
	if err != nil {
		return nil, err
	}

	return &types.RealtimeConnectionResponse{
		URL:       uc.streamURL + "?" + url.Values{"ticket": {ticket.Ticket}}.Encode(),
		ExpiresAt: ticket.ExpiresAt,
	}, nil
}

func (uc *RealtimeUseCase) RedeemTicket(ctx context.Context, ticket string) (*types.RealtimeTicketClaims, error) {
	return uc.realtimeService.RedeemTicket(ctx, ticket)
}

func (uc *RealtimeUseCase) Subscribe(ctx context.Context, teamID uuid.UUID) (<-chan *types.RealtimeEvent, func() error, error) {
	return uc.realtimeService.Subscribe(ctx, teamID)
}
