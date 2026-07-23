package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/swaggest/jsonschema-go"
	"github.com/uptrace/bun"
)

type StepType string

const (
	StepTypeInteraction StepType = "interaction"
	StepTypeCanvas      StepType = "canvas"
)

func (StepType) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(StepTypeInteraction),
		string(StepTypeCanvas),
	}
	schema.WithDescription("The browser interaction type captured for the step")
	return nil
}

type StepAction string

const (
	StepActionClick      StepAction = "click"
	StepActionInput      StepAction = "input"
	StepActionNavigation StepAction = "navigation"
	StepActionKeypress   StepAction = "keypress"
)

func (StepAction) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(StepActionClick),
		string(StepActionInput),
		string(StepActionNavigation),
		string(StepActionKeypress),
	}
	schema.WithDescription("The browser interaction type captured for the step")
	return nil
}

type StepCanvasType string

const (
	StepCanvasTypeCallout StepCanvasType = "callout"
	StepCanvasTypeAlert   StepCanvasType = "alert"
	StepCanvasTypeTip     StepCanvasType = "tip"
	StepCanvasTypeHeader  StepCanvasType = "header"
)

func (StepCanvasType) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(StepCanvasTypeCallout),
		string(StepCanvasTypeAlert),
		string(StepCanvasTypeTip),
		string(StepCanvasTypeHeader),
	}
	schema.WithDescription("The type of the canvas element")
	return nil
}

type StepCanvasContent struct {
	Type        StepCanvasType `json:"type" validate:"required,oneof=callout alert tip header" required:"true" nullable:"false"`
	HeadingText *string        `json:"heading_text,omitempty"`
	BodyText    *string        `json:"body_text,omitempty"`
}

type Step struct {
	bun.BaseModel `bun:"table:steps"`

	ID            uuid.UUID          `json:"id" bun:"column:id,pk" required:"true"`
	GuideID       uuid.UUID          `json:"guide_id" bun:"column:guide_id" required:"true"`
	Type          StepType           `json:"type" bun:"column:type" required:"true"`
	SortOrder     string             `json:"sort_order" bun:"column:sort_order" required:"true"`
	Notes         *string            `json:"notes,omitempty" bun:"column:notes" nullable:"true"`
	Action        *StepAction        `json:"action,omitempty" bun:"column:action" nullable:"true"`
	ActionText    *string            `json:"action_text,omitempty" bun:"column:action_text" nullable:"true"`
	URL           *string            `json:"url,omitempty" bun:"column:url" nullable:"true"`
	TargetElement map[string]any     `json:"target_element,omitempty" bun:"column:target_element,type:jsonb" nullable:"true"`
	CanvasContent *StepCanvasContent `json:"canvas_content,omitempty" bun:"column:canvas_content,type:jsonb" nullable:"true"`
	CreatedAt     time.Time          `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`
	UpdatedAt     time.Time          `json:"updated_at" bun:"column:updated_at,default:current_timestamp" required:"true"`

	MediaAssets []*MediaAsset `bun:"rel:has-many,join:id=step_id" json:"media_assets,omitempty"`
}
