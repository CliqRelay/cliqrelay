package types

import "github.com/swaggest/jsonschema-go"

type Team struct {
	ID             string `json:"id" required:"true" nullable:"false"`
	Name           string `json:"name" required:"true" nullable:"false"`
	OrganizationID string `json:"organization_id" required:"true" nullable:"false"`
	OwnerID        string `json:"owner_id" required:"true" nullable:"false"`
	CreatedAt      string `json:"created_at" required:"true" nullable:"false"`
	UpdatedAt      string `json:"updated_at" required:"true" nullable:"false"`
}

func (Team) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("A team within an organization")
	return nil
}

type GetAllTeamsResponse struct {
	Teams []Team `json:"teams" required:"true" nullable:"false"`
}

func (GetAllTeamsResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response containing all teams")
	return nil
}
