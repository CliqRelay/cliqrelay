package types

import (
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type GuideID struct {
	ID string `path:"id" validate:"required,uuid"`
}

func (r *GuideID) Validate() error {
	return validator.Validate.Struct(r)
}

type GuideExportID struct {
	ID string `path:"exportID" validate:"required,uuid"`
}

func (r *GuideExportID) Validate() error {
	return validator.Validate.Struct(r)
}

type GuideStatus struct {
	Status models.GuideStatus `query:"status" validate:"omitempty" nullable:"true"`
}

func (r *GuideStatus) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateGuideRequest struct {
	Title       string  `json:"title" validate:"required,lte=255" required:"true"`
	Description *string `json:"description,omitempty" nullable:"true"`
}

func (r *CreateGuideRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}
	return nil
}

type CreateGuideDTO struct {
	Title       string  `json:"title" required:"true" validate:"required,lte=255"`
	Description *string `json:"description,omitempty"`
}

func (r *CreateGuideDTO) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type GetAllGuidesResponse struct {
	Guides []*models.Guide `json:"guides" required:"true" nullable:"false"`
}

type GetGuideByIDResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"true"`
}

type UpdateGuideRequest struct {
	Title       *string `json:"title,omitempty" validate:"omitempty,gt=0,lte=255" nullable:"true"`
	Description *string `json:"description,omitempty" validate:"omitempty,gt=0" nullable:"true"`
}

func (r *UpdateGuideRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}

	return nil
}

type UpdateGuideDTO struct {
	ID          uuid.UUID `json:"id" required:"true" validate:"required"`
	Title       *string   `json:"title,omitempty" validate:"omitempty,lte=255" nullable:"true"`
	Description *string   `json:"description,omitempty" nullable:"true"`
}

func (r *UpdateGuideDTO) Validate() error {
	return validator.Validate.Struct(r)
}

type UpdateGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type DeleteGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type PublishGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type UnpublishGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type ArchiveGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type UnarchiveGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type RestoreGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type PermanentlyDeleteGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type GetGuidesCountResponse struct {
	Count int `json:"count" required:"true" nullable:"false"`
}

type StarGuideResponse struct {
	Message string `json:"message" required:"true" nullable:"false"`
}

type UnstarGuideResponse struct {
	Message string `json:"message" required:"true" nullable:"false"`
}

type RecalculateDurationResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type ExportGuideRequest struct {
	Format models.ExportGuideFormat `json:"format" validate:"required,oneof=pdf json markdown html" required:"true"`
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
