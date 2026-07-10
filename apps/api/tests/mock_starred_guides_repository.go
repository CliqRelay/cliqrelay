package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/types"
)

type MockStarredGuidesRepository struct {
	mock.Mock
}

func (m *MockStarredGuidesRepository) GetAll(ctx context.Context, filter *types.GuideFilter) ([]*types.GuideWithStarred, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*types.GuideWithStarred), args.Error(1)
}

func (m *MockStarredGuidesRepository) Star(ctx context.Context, userID string, guideID uuid.UUID) error {
	args := m.Called(ctx, userID, guideID)
	return args.Error(0)
}

func (m *MockStarredGuidesRepository) Unstar(ctx context.Context, userID string, guideID uuid.UUID) error {
	args := m.Called(ctx, userID, guideID)
	return args.Error(0)
}
