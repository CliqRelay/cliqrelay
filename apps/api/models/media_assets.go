package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type MediaAsset struct {
	bun.BaseModel `bun:"table:media_assets"`

	ID          uuid.UUID `json:"id" bun:"column:id,pk" required:"true"`
	StepID      uuid.UUID `json:"step_id" bun:"column:step_id" required:"true"`
	WorkspaceID uuid.UUID `json:"workspace_id" bun:"column:workspace_id,type:uuid,notnull" required:"true"`
	StoragePath string    `json:"storage_path" bun:"column:storage_path" required:"true"`
	Thumbnail   *string   `json:"thumbnail,omitempty" bun:"column:thumbnail" nullable:"true"`
	URL         *string   `json:"url,omitempty" bun:"-" nullable:"true"`
	MimeType    *string   `json:"mime_type,omitempty" bun:"column:mime_type" nullable:"true"`
	AltText     *string   `json:"alt_text,omitempty" bun:"column:alt_text" nullable:"true"`
	Height      *int      `json:"height,omitempty" bun:"column:height" nullable:"true"`
	Width       *int      `json:"width,omitempty" bun:"column:width" nullable:"true"`
	ByteSize    *int      `json:"byte_size,omitempty" bun:"column:byte_size" nullable:"true"`
	CreatedAt   time.Time `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`
	UpdatedAt   time.Time `json:"updated_at" bun:"column:updated_at,default:current_timestamp" required:"true"`
}
