package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

type MockGuidesCacheService struct {
	mock.Mock
}

func (m *MockGuidesCacheService) Get(ctx context.Context, guideID string) (*models.Guide, error) {
	args := m.Called(ctx, guideID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesCacheService) Set(ctx context.Context, guide *models.Guide) error {
	args := m.Called(ctx, guide)
	return args.Error(0)
}

func (m *MockGuidesCacheService) Invalidate(ctx context.Context, guideID string) error {
	args := m.Called(ctx, guideID)
	return args.Error(0)
}
