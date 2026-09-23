package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/models"
)

type MockActivityLogsService struct {
	mock.Mock
}

func (m *MockActivityLogsService) Record(ctx context.Context, payload *events.ActivityRecordedPayload) error {
	args := m.Called(ctx, payload)
	return args.Error(0)
}

func (m *MockActivityLogsService) List(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error) {
	args := m.Called(ctx, teamID, viewerUserID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*models.ActivityLog), args.Error(1)
}

func (m *MockActivityLogsService) DeleteByTarget(ctx context.Context, targetType, targetID string) error {
	args := m.Called(ctx, targetType, targetID)
	return args.Error(0)
}
