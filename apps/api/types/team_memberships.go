package types

import "github.com/swaggest/jsonschema-go"

type MemberID struct {
	MemberID string `path:"memberId" validate:"required,uuid"`
}

func (MemberID) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("The organization member ID")
	return nil
}

type GetTeamMembershipsRequest struct {
	OrganizationID string `query:"organization_id" required:"true" nullable:"false" validate:"required,uuid"`
}

func (GetTeamMembershipsRequest) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Query parameters for getting team memberships")
	return nil
}

type GetTeamMembershipsResponse struct {
	TeamIDs []string `json:"team_ids" required:"true" nullable:"false"`
}

func (GetTeamMembershipsResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response containing the list of team IDs the member belongs to")
	return nil
}

type UpdateTeamMembershipsRequest struct {
	OrganizationID string   `json:"organization_id" required:"true" nullable:"false" validate:"required,uuid"`
	TeamIDs        []string `json:"team_ids" required:"true" nullable:"false" validate:"dive,uuid"`
}

func (UpdateTeamMembershipsRequest) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Request body for updating a member's team memberships")
	return nil
}

type UpdateTeamMembershipsResponse struct {
	TeamIDs []string `json:"team_ids" required:"true" nullable:"false"`
	Errors  []string `json:"errors,omitempty" nullable:"true"`
}

func (UpdateTeamMembershipsResponse) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithDescription("Response after updating a member's team memberships")
	return nil
}
