package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockAuthorizationService struct {
	mock.Mock
}

func (m *MockAuthorizationService) CanCreateGuide(ctx context.Context, identity *models.Identity) error {
	args := m.Called(ctx, identity)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanReadGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	args := m.Called(ctx, identity, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanEditGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	args := m.Called(ctx, identity, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanDeleteGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	args := m.Called(ctx, identity, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) GuideListFilter(ctx context.Context, identity *models.Identity) (*types.GuideFilter, error) {
	args := m.Called(ctx, identity)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.GuideFilter), args.Error(1)
}
