package interfaces

import (
	"context"

	"github.com/google/uuid"

	cliqmodels "github.com/CliqRelay/cliqrelay/models"
)

type ExportService interface {
	RequestExport(ctx context.Context, actorID, guideID string, format cliqmodels.ExportGuideFormat) (*uuid.UUID, error)
	GetExportStatus(ctx context.Context, actorID, exportID string) (*cliqmodels.GuideExport, error)
	GenerateExport(ctx context.Context, exportID uuid.UUID, guideID uuid.UUID, format cliqmodels.ExportGuideFormat) error
}
