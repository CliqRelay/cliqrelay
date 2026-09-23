package tests

import (
	"context"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

type MockActivityLogsRepository struct {
	mock.Mock
}

func (m *MockActivityLogsRepository) Insert(ctx context.Context, log *models.ActivityLog) (bool, error) {
	args := m.Called(ctx, log)
	return args.Bool(0), args.Error(1)
}

func (m *MockActivityLogsRepository) InsertOrMergeUpdate(ctx context.Context, log *models.ActivityLog, window time.Duration) (*models.ActivityLog, bool, error) {
	args := m.Called(ctx, log, window)
	if args.Get(0) == nil {
		return nil, args.Bool(1), args.Error(2)
	}
	return args.Get(0).(*models.ActivityLog), args.Bool(1), args.Error(2)
}

func (m *MockActivityLogsRepository) ListByTeam(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error) {
	args := m.Called(ctx, teamID, viewerUserID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.ActivityLog), args.Error(1)
}

func (m *MockActivityLogsRepository) DeleteByTarget(ctx context.Context, targetType, targetID string) error {
	args := m.Called(ctx, targetType, targetID)
	return args.Error(0)
}

func (m *MockActivityLogsRepository) SyncGuideVisibility(ctx context.Context, guideID string, visibility models.Visibility) error {
	args := m.Called(ctx, guideID, visibility)
	return args.Error(0)
}

func (m *MockActivityLogsRepository) GetUserByID(ctx context.Context, userID string) (*authulamodels.User, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*authulamodels.User), args.Error(1)
}

func (m *MockActivityLogsRepository) GetTeamOrganizationID(ctx context.Context, teamID uuid.UUID) (uuid.UUID, error) {
	args := m.Called(ctx, teamID)
	return args.Get(0).(uuid.UUID), args.Error(1)
}
