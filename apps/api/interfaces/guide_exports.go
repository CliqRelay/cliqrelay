package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
)

type GuideExportsRepository interface {
	Create(ctx context.Context, workspaceID string, guideID uuid.UUID, userID string, format models.ExportGuideFormat) (*models.GuideExport, error)
	GetByID(ctx context.Context, workspaceID string, id uuid.UUID, userID string) (*models.GuideExport, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status models.ExportStatus, storagePath string, errMsg string) error
}
