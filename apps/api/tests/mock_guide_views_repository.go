package tests

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/types"
)

type MockGuideViewsRepository struct {
	mock.Mock
}

func (m *MockGuideViewsRepository) Create(ctx context.Context, dto *types.CreateGuideViewDTO) error {
	args := m.Called(ctx, dto)
	return args.Error(0)
}

func (m *MockGuideViewsRepository) GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error) {
	args := m.Called(ctx, teamID, since)
	return args.Int(0), args.Error(1)
}
