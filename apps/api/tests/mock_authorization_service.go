package tests

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockAuthorizationService struct {
	mock.Mock
}

func (m *MockAuthorizationService) CanCreateGuide(ctx context.Context, actor *authulamodels.Actor, workspaceID string) error {
	args := m.Called(ctx, actor, workspaceID)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanReadGuide(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guide *models.Guide) error {
	args := m.Called(ctx, actor, workspaceID, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanEditGuide(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guide *models.Guide) error {
	args := m.Called(ctx, actor, workspaceID, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guide *models.Guide) error {
	args := m.Called(ctx, actor, workspaceID, guide)
	return args.Error(0)
}

func (m *MockAuthorizationService) GuideListFilter(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (*types.GuideFilter, error) {
	args := m.Called(ctx, actor, workspaceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.GuideFilter), args.Error(1)
}
