package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MockGuidesRepository struct {
	mock.Mock
}

func (m *MockGuidesRepository) Tx(ctx context.Context, fn func(ctx context.Context, repo interfaces.GuidesRepository) error) error {
	return fn(ctx, m)
}

func (m *MockGuidesRepository) LockOrganizationForUpdate(ctx context.Context, teamID uuid.UUID) error {
	args := m.Called(ctx, teamID)
	return args.Error(0)
}

func (m *MockGuidesRepository) Create(ctx context.Context, data *types.CreateGuideDTO) (*models.Guide, error) {
	args := m.Called(ctx, data)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetAll(ctx context.Context, filter *types.GuideFilter) ([]*models.Guide, int, error) {
	args := m.Called(ctx, filter)
	return args.Get(0).([]*models.Guide), args.Int(1), args.Error(2)
}

func (m *MockGuidesRepository) GetByID(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Update(ctx context.Context, data *types.UpdateGuideDTO) (*models.Guide, error) {
	args := m.Called(ctx, data)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Delete(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Publish(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Unpublish(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Archive(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Unarchive(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) Restore(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) PermanentlyDelete(ctx context.Context, id string) (*models.Guide, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Guide), args.Error(1)
}

func (m *MockGuidesRepository) GetCount(ctx context.Context, filter *types.GuideFilter) (int, error) {
	args := m.Called(ctx, filter)
	return args.Int(0), args.Error(1)
}

func (m *MockGuidesRepository) UpdateDuration(ctx context.Context, id string, durationSeconds int) (*models.Guide, error) {
	args := m.Called(ctx, id, durationSeconds)
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

func (m *MockGuidesRepository) BulkDelete(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	args := m.Called(ctx, ids, teamID, actorID, isAdmin)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockGuidesRepository) BulkRestore(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	args := m.Called(ctx, ids, teamID, actorID, isAdmin)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockGuidesRepository) BulkPermanentlyDelete(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	args := m.Called(ctx, ids, teamID, actorID, isAdmin)
	return args.Get(0).(int64), args.Error(1)
}
