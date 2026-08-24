package models

import (
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
)

type Team struct {
	orgtypes.OrganizationTeam

	OwnerID string `bun:"owner_id"`
}
