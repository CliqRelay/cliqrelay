package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/internal/models"
)

type MockStarredGuidesRepository struct {
	mock.Mock
}

func (m *MockStarredGuidesRepository) GetAllWithStarred(ctx context.Context, userID string) ([]*models.Guide, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*models.Guide), args.Error(1)
}

func (m *MockStarredGuidesRepository) GetAllByStatusWithStarred(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error) {
	args := m.Called(ctx, userID, status)
	return args.Get(0).([]*models.Guide), args.Error(1)
}

func (m *MockStarredGuidesRepository) GetStarredGuides(ctx context.Context, userID string) ([]*models.Guide, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*models.Guide), args.Error(1)
}

func (m *MockStarredGuidesRepository) Star(ctx context.Context, userID string, guideID uuid.UUID) error {
	args := m.Called(ctx, userID, guideID)
	return args.Error(0)
}

func (m *MockStarredGuidesRepository) Unstar(ctx context.Context, userID string, guideID uuid.UUID) error {
	args := m.Called(ctx, userID, guideID)
	return args.Error(0)
}
