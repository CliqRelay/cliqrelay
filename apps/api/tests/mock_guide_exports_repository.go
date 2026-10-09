package tests

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

type MockGuideExportsRepository struct {
	mock.Mock
}

func (m *MockGuideExportsRepository) Create(ctx context.Context, guideID uuid.UUID, userID string, format models.ExportGuideFormat) (*models.GuideExport, error) {
	args := m.Called(ctx, guideID, userID, format)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GuideExport), args.Error(1)
}

func (m *MockGuideExportsRepository) GetByID(ctx context.Context, id uuid.UUID, userID string) (*models.GuideExport, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.GuideExport), args.Error(1)
}

func (m *MockGuideExportsRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.ExportStatus, storagePath string, errMsg string) error {
	args := m.Called(ctx, id, status, storagePath, errMsg)
	return args.Error(0)
}
