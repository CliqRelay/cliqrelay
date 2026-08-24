package models

import "time"

// Team is a read-only projection over the Authula organizations plugin's
// organization_teams table joined with its owning organization. Authula owns
// these tables, so this app never writes to them.
//
// No bun.BaseModel: the queries select through TableExpr rather than a model,
// mirroring types.GuideViewStats. IDs are strings because Authula stores them
// as text-typed UUIDs, unlike CliqRelay's own uuid.UUID models.
type Team struct {
	ID             string `bun:"id"`
	OrganizationID string `bun:"organization_id"`
	Name           string `bun:"name"`
	// OwnerID is organizations.owner_id. organization_teams has no owner column;
	// teams are owned by whoever owns the organization.
	OwnerID   string    `bun:"owner_id"`
	CreatedAt time.Time `bun:"created_at"`
	UpdatedAt time.Time `bun:"updated_at"`
}
