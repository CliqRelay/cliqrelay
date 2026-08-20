package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type GuideView struct {
	bun.BaseModel `bun:"table:guide_views"`

	ID              uuid.UUID `json:"id" bun:"column:id,pk" required:"true"`
	TeamID          uuid.UUID `json:"team_id" bun:"column:team_id,type:uuid,notnull" required:"true"`
	GuideID         uuid.UUID `json:"guide_id" bun:"column:guide_id,type:uuid,notnull" required:"true"`
	ViewerID        *string   `json:"viewer_id,omitempty" bun:"column:viewer_id" nullable:"true"`
	IPHash          *string   `json:"ip_hash,omitempty" bun:"column:ip_hash" nullable:"true"`
	UserAgent       *string   `json:"user_agent,omitempty" bun:"column:user_agent" nullable:"true"`
	DurationSeconds int       `json:"duration_seconds" bun:"column:duration_seconds" required:"true"`
	ViewedAt        time.Time `json:"viewed_at" bun:"column:viewed_at" required:"true"`
}
