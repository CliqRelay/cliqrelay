package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockGuidesRepository struct {
	mock.Mock
}

func (m *MockGuidesRepository) Create(ctx context.Context, userID string, data *types.CreateGuideDTO) (*models.Guide, error) {
	args := m.Called(ctx, userID, data)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetAll(ctx context.Context, userID string) ([]*models.Guide, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetByID(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetByIDAnyUser(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Update(ctx context.Context, userID string, data *types.UpdateGuideDTO) (*models.Guide, error) {
	args := m.Called(ctx, userID, data)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Delete(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Publish(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Unpublish(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Archive(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Unarchive(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Restore(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetAllByStatus(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error) {
	args := m.Called(ctx, userID, status)
	return args.Get(0).([]*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetCount(ctx context.Context, userID string) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockGuidesRepository) PermanentlyDelete(ctx context.Context, userID string, id string) (*models.Guide, error) {
	args := m.Called(ctx, userID, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) UpdateDuration(ctx context.Context, userID string, id string, durationSeconds int) (*models.Guide, error) {
	args := m.Called(ctx, userID, id, durationSeconds)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetPendingPurge(ctx context.Context) ([]uuid.UUID, error) {
	args := m.Called(ctx)
	return args.Get(0).([]uuid.UUID), args.Error(1)
}

func (m *MockGuidesRepository) HardDelete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
