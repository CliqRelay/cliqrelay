package types

import (
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type ExportGuideRequest struct {
	Format models.ExportGuideFormat `json:"format" validate:"required,oneof=pdf markdown html" required:"true"`
}

func (r *ExportGuideRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type ExportGuideResponse struct {
	ExportID string              `json:"export_id" required:"true" nullable:"false"`
	Status   models.ExportStatus `json:"status" required:"true" nullable:"false"`
}

type GetExportStatusResponse struct {
	Export *models.GuideExport `json:"export" required:"true" nullable:"true"`
}
