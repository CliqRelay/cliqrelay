package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/swaggest/jsonschema-go"
	"github.com/uptrace/bun"
)

type WorkspaceType string

const (
	WorkspaceTypePersonal WorkspaceType = "personal"
	WorkspaceTypeTeam     WorkspaceType = "team"
)

func (WorkspaceType) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(WorkspaceTypePersonal),
		string(WorkspaceTypeTeam),
	}
	schema.WithDescription("The workspace type")
	return nil
}

type Workspace struct {
	bun.BaseModel `bun:"table:workspaces"`

	ID             uuid.UUID     `json:"id" bun:"column:id,pk" required:"true" nullable:"false"`
	OrganizationID string        `json:"organization_id" bun:"column:organization_id" required:"true" nullable:"false"`
	OwnerID        *string       `json:"owner_id,omitempty" bun:"column:owner_id" nullable:"true"`
	Name           string        `json:"name" bun:"column:name" required:"true" nullable:"false"`
	Type           WorkspaceType `json:"type" bun:"column:type" required:"true" nullable:"false"`
	CreatedAt      time.Time     `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true" nullable:"false"`
	UpdatedAt      time.Time     `json:"updated_at" bun:"column:updated_at,default:current_timestamp" required:"true" nullable:"false"`
}
