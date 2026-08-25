package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

type MockTeamsRepository struct {
	mock.Mock
}

func (m *MockTeamsRepository) GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.Team), args.Error(1)
}

func (m *MockTeamsRepository) GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error) {
	args := m.Called(ctx, userID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Team), args.Error(1)
}
