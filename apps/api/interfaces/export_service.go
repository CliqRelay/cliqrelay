package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	cliqmodels "github.com/CliqRelay/cliqrelay/models"
)

type ExportService interface {
	RequestExport(reqCtx *authulamodels.RequestContext, guideID string, format cliqmodels.ExportGuideFormat) (*uuid.UUID, error)
	GetExportStatus(reqCtx *authulamodels.RequestContext, exportID string) (*cliqmodels.GuideExport, error)
	GenerateExport(ctx context.Context, exportID uuid.UUID, guideID uuid.UUID, format cliqmodels.ExportGuideFormat) error
}
