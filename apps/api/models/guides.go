package models

import (
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/swaggest/jsonschema-go"
	"github.com/uptrace/bun"
)

type GuideStatus string

const (
	StatusDraft        GuideStatus = "draft"
	StatusPublished    GuideStatus = "published"
	StatusArchived     GuideStatus = "archived"
	StatusDeleted      GuideStatus = "deleted"
	StatusPendingPurge GuideStatus = "pending_purge"
)

func (s GuideStatus) ToString() string {
	return string(s)
}

func (GuideStatus) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(StatusDraft),
		string(StatusPublished),
		string(StatusArchived),
		string(StatusDeleted),
		string(StatusPendingPurge),
	}
	schema.WithDescription("The status of the guide")
	return nil
}

type ExportGuideFormat string

const (
	ExportGuideFormatPDF      ExportGuideFormat = "pdf"
	ExportGuideFormatJSON     ExportGuideFormat = "json"
	ExportGuideFormatMarkdown ExportGuideFormat = "markdown"
	ExportGuideFormatHTML     ExportGuideFormat = "html"
)

func (s ExportGuideFormat) ToString() string {
	return string(s)
}

func (ExportGuideFormat) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(ExportGuideFormatPDF),
		string(ExportGuideFormatJSON),
		string(ExportGuideFormatMarkdown),
		string(ExportGuideFormatHTML),
	}
	schema.WithDescription("The type of the guide document to export")
	return nil
}

type Guide struct {
	bun.BaseModel `bun:"table:guides"`

	ID               uuid.UUID   `json:"id" bun:"column:id,pk" required:"true"`
	TeamID           uuid.UUID   `json:"team_id" bun:"column:team_id,type:uuid,notnull" required:"true"`
	CreatorID        string      `json:"creator_id" bun:"column:creator_id" required:"true"`
	Title            string      `json:"title" bun:"column:title" required:"true"`
	Description      *string     `json:"description,omitempty" bun:"column:description" nullable:"true"`
	Status           GuideStatus `json:"status" bun:"column:status" required:"true"`
	DurationSeconds  int         `json:"duration_seconds" bun:"column:duration_seconds" required:"true"`
	PublishedAt      *time.Time  `json:"published_at,omitempty" bun:"column:published_at" nullable:"true"`
	ArchivedAt       *time.Time  `json:"archived_at,omitempty" bun:"column:archived_at" nullable:"true"`
	DeletedAt        *time.Time  `json:"deleted_at,omitempty" bun:"column:deleted_at" nullable:"true"`
	RestoredAt       *time.Time  `json:"restored_at,omitempty" bun:"column:restored_at" nullable:"true"`
	PurgeRequestedAt *time.Time  `json:"purge_requested_at,omitempty" bun:"column:purge_requested_at" nullable:"true"`
	IsStarred        bool        `json:"is_starred" bun:"-" required:"true"`
	CreatedAt        time.Time   `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`
	UpdatedAt        time.Time   `json:"updated_at" bun:"column:updated_at,default:current_timestamp" required:"true"`
}

type StarredGuide struct {
	bun.BaseModel `bun:"table:starred_guides"`

	UserID      string    `json:"user_id" bun:"column:user_id,pk" required:"true"`
	GuideID     uuid.UUID `json:"guide_id" bun:"column:guide_id,pk" required:"true"`
	CreatedAt   time.Time `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`

	Guide *Guide `json:"guide,omitempty" bun:"rel:belongs-to,join:guide_id=id"`
}

func wordCount(s *string) int {
	if s == nil {
		return 0
	}
	return len(strings.Fields(*s))
}

func CalculateSyntheticDuration(steps []*Step) int {
	total := 0
	for _, step := range steps {
		baseline := 2
		if step.Action != nil && *step.Action == StepActionInput {
			baseline = 3
		}

		var words int
		if step.Type == StepTypeCanvas {
			if step.CanvasContent != nil {
				words += wordCount(step.CanvasContent.HeadingText)
				words += wordCount(step.CanvasContent.BodyText)
			}
			words += wordCount(step.Notes)
		} else {
			words += wordCount(step.ActionText)
			words += wordCount(step.Notes)
		}

		readingTime := int(math.Round(float64(words) / 225.0 * 60.0))
		total += baseline + readingTime
	}
	return total
}
