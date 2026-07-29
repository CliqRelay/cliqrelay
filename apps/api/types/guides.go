package types

import (
	"time"

	"github.com/google/uuid"
	"github.com/swaggest/jsonschema-go"

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

type TeamIDQueryParam struct {
	ID string `query:"team_id" validate:"required,uuid"`
}

func (r *TeamIDQueryParam) Validate() error {
	return validator.Validate.Struct(r)
}

type GetAllGuidesQueryParams struct {
	TeamID          string              `query:"team_id" validate:"required,uuid"`
	Status          *models.GuideStatus `query:"status" validate:"omitempty" nullable:"true"`
	ExcludeArchived bool                `query:"exclude_archived" nullable:"true"`
	Page            int                 `query:"page" validate:"omitempty,gt=0" nullable:"true"`
	Limit           int                 `query:"limit" validate:"omitempty,gt=0" nullable:"true"`
	SortBy          *GuideSortField     `query:"sort_by" validate:"omitempty" nullable:"true"`
	SortDir         *string             `query:"sort_dir" validate:"omitempty,oneof=asc desc" nullable:"true"`
}

func (r *GuideStatus) Validate() error {
	return validator.Validate.Struct(r)
}

type GuideSortField string

const (
	GuideSortCreatedAt GuideSortField = "created_at"
	GuideSortUpdatedAt GuideSortField = "updated_at"
)

func (GuideSortField) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(GuideSortCreatedAt),
		string(GuideSortUpdatedAt),
	}
	schema.WithDescription("The field to sort guides by")
	return nil
}

type GuideWithStarred struct {
	models.Guide `json:",inline"`
	IsStarred    bool `json:"is_starred"`
	TotalCount   int  `json:"-" bun:"total_count"`
}

type GuideFilter struct {
	IDs             []uuid.UUID
	TeamID          *uuid.UUID
	CreatorID       *string
	ViewerUserID    *string
	Status          *models.GuideStatus
	Search          *string
	DeletedOnly     bool
	ArchivedOnly    bool
	PublishedOnly   bool
	ExcludeArchived bool
	AccessibleOnly  bool
	CreatedAfter    *time.Time
	CreatedBefore   *time.Time
	Limit           int
	Offset          int
	SortBy          GuideSortField
	SortDesc        bool
}

type CreateGuideRequest struct {
	TeamID      uuid.UUID `json:"team_id" validate:"required,uuid" required:"true"`
	Title       string    `json:"title" validate:"required,lte=255" required:"true"`
	Description *string   `json:"description,omitempty" nullable:"true"`
}

func (r *CreateGuideRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}
	return nil
}

type CreateGuideDTO struct {
	TeamID      uuid.UUID `json:"team_id" validate:"required"`
	CreatorID   string    `json:"-"`
	Title       string    `json:"title" required:"true" validate:"required,lte=255"`
	Description *string   `json:"description,omitempty"`
}

func (r *CreateGuideDTO) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateGuideResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"false"`
}

type GetAllGuidesResponse struct {
	Data  []*models.Guide `json:"data" required:"true" nullable:"false"`
	Total int             `json:"total" required:"true" nullable:"false"`
	Page  int             `json:"page" required:"true" nullable:"false"`
	Limit int             `json:"limit" required:"true" nullable:"false"`
}

type GetStarredGuidesQueryParams struct {
	TeamID string `query:"team_id" validate:"required,uuid"`
	Page   int    `query:"page" validate:"omitempty,gt=0" nullable:"true"`
	Limit  int    `query:"limit" validate:"omitempty,gt=0" nullable:"true"`
}

type GetStarredGuidesResponse struct {
	Data  []*models.Guide `json:"data" required:"true" nullable:"false"`
	Total int             `json:"total" required:"true" nullable:"false"`
	Page  int             `json:"page" required:"true" nullable:"false"`
	Limit int             `json:"limit" required:"true" nullable:"false"`
}

type GetGuideByIDResponse struct {
	Guide *models.Guide `json:"guide" required:"true" nullable:"true"`
}

type UpdateGuideRequest struct {
	Title       *string           `json:"title,omitempty" validate:"omitempty,gt=0,lte=255" nullable:"true"`
	Description *string           `json:"description,omitempty" validate:"omitempty,gt=0" nullable:"true"`
	Visibility  *models.Visibility `json:"visibility,omitempty" validate:"omitempty,oneof=private team public" nullable:"true"`
}

func (r *UpdateGuideRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}

	return nil
}

type UpdateGuideDTO struct {
	ID          uuid.UUID          `json:"id" required:"true" validate:"required"`
	TeamID      uuid.UUID          `json:"team_id" validate:"required"`
	Title       *string            `json:"title,omitempty" validate:"omitempty,lte=255" nullable:"true"`
	Description *string            `json:"description,omitempty" nullable:"true"`
	Visibility  *models.Visibility `json:"visibility,omitempty" nullable:"true"`
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

type BulkGuidesActionQuery struct {
	Action string `query:"action" validate:"required,oneof=delete restore permanently-delete"`
}

func (r *BulkGuidesActionQuery) Validate() error {
	return validator.Validate.Struct(r)
}

type BulkGuidesRequest struct {
	TeamID string   `json:"team_id" validate:"required,uuid"`
	IDs    []string `json:"ids" validate:"required,min=1,max=100,dive,uuid"`
}

func (r *BulkGuidesRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type BulkGuidesResponse struct {
	Message string `json:"message" required:"true" nullable:"false"`
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

type CreateDemoGuideRequest struct {
	TeamID uuid.UUID `json:"team_id" validate:"required,uuid" required:"true" nullable:"false"`
}

func (r *CreateDemoGuideRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateDemoGuideResponse struct {
	GuideID string `json:"guide_id" required:"true"`
}
