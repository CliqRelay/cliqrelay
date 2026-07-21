package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type ExportStatus string

const (
	ExportStatusPending    ExportStatus = "pending"
	ExportStatusProcessing ExportStatus = "processing"
	ExportStatusCompleted  ExportStatus = "completed"
	ExportStatusFailed     ExportStatus = "failed"
)

func (s ExportStatus) ToString() string {
	return string(s)
}

type GuideExport struct {
	bun.BaseModel `bun:"table:guide_exports"`

	ID           uuid.UUID         `json:"id" bun:"column:id,pk" required:"true"`
	GuideID      uuid.UUID         `json:"guide_id" bun:"column:guide_id" required:"true"`
	WorkspaceID  uuid.UUID         `json:"workspace_id" bun:"column:workspace_id,type:uuid,notnull" required:"true"`
	UserID       string            `json:"user_id" bun:"column:user_id" required:"true"`
	Format       ExportGuideFormat `json:"format" bun:"column:format" required:"true"`
	Status       ExportStatus      `json:"status" bun:"column:status" required:"true"`
	StoragePath  *string           `json:"storage_path,omitempty" bun:"column:storage_path" nullable:"true"`
	DownloadURL  *string           `json:"download_url,omitempty" bun:"-" nullable:"true"`
	ErrorMessage *string           `json:"error_message,omitempty" bun:"column:error_message" nullable:"true"`
	CreatedAt    time.Time         `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`
	UpdatedAt    time.Time         `json:"updated_at" bun:"column:updated_at,default:current_timestamp" required:"true"`
}
