package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/types"
)

type MockRealtimeService struct {
	mock.Mock
}

func (m *MockRealtimeService) IssueTicket(ctx context.Context, userID string, teamID uuid.UUID) (*types.RealtimeTicket, error) {
	args := m.Called(ctx, userID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.RealtimeTicket), args.Error(1)
}

func (m *MockRealtimeService) RedeemTicket(ctx context.Context, ticket string) (*types.RealtimeTicketClaims, error) {
	args := m.Called(ctx, ticket)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.RealtimeTicketClaims), args.Error(1)
}

func (m *MockRealtimeService) Publish(ctx context.Context, teamID uuid.UUID, eventType string, data any, userIDs ...string) error {
	args := m.Called(ctx, teamID, eventType, data, userIDs)
	return args.Error(0)
}

func (m *MockRealtimeService) Subscribe(ctx context.Context, teamID uuid.UUID) (<-chan *types.RealtimeEvent, func() error, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, nil, args.Error(2)
	}
	return args.Get(0).(<-chan *types.RealtimeEvent), args.Get(1).(func() error), args.Error(2)
}
