package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockStepsRepository struct {
	mock.Mock
}

func (m *MockStepsRepository) Create(ctx context.Context, dto *types.CreateStepDTO) (*models.Step, error) {
	args := m.Called(ctx, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Step), args.Error(1)
}

func (m *MockStepsRepository) GetByID(ctx context.Context, id string) (*models.Step, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Step), args.Error(1)
}

func (m *MockStepsRepository) GetByGuideID(ctx context.Context, guideID string) ([]*models.Step, error) {
	args := m.Called(ctx, guideID)
	return args.Get(0).([]*models.Step), args.Error(1)
}

func (m *MockStepsRepository) Update(ctx context.Context, dto *types.UpdateStepDTO) (*models.Step, error) {
	args := m.Called(ctx, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Step), args.Error(1)
}

func (m *MockStepsRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStepsRepository) Reorder(ctx context.Context, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error) {
	args := m.Called(ctx, guideID, targetStepID, prevStepID, nextStepID)
	return args.Get(0).([]*models.Step), args.Error(1)
}

func (m *MockStepsRepository) Tx(ctx context.Context, fn func(ctx context.Context, repo interfaces.StepsRepository) error) error {
	args := m.Called(ctx, fn)
	return args.Error(0)
}
