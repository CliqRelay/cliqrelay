package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockMediaAssetsRepository struct {
	mock.Mock
}

func (m *MockMediaAssetsRepository) Create(ctx context.Context, dto *types.CreateMediaAssetDTO) (*models.MediaAsset, error) {
	args := m.Called(ctx, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MediaAsset), args.Error(1)
}

func (m *MockMediaAssetsRepository) GetByID(ctx context.Context, id string) (*models.MediaAsset, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MediaAsset), args.Error(1)
}

func (m *MockMediaAssetsRepository) GetByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error) {
	args := m.Called(ctx, stepID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.MediaAsset), args.Error(1)
}

func (m *MockMediaAssetsRepository) Update(ctx context.Context, dto *types.UpdateMediaAssetDTO) (*models.MediaAsset, error) {
	args := m.Called(ctx, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MediaAsset), args.Error(1)
}

func (m *MockMediaAssetsRepository) Delete(ctx context.Context, id string) (*models.MediaAsset, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.MediaAsset), args.Error(1)
}
