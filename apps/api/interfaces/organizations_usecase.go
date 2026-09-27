package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
)

// OrgMembershipAPI is the subset of the Authula organizations plugin API used
// to resolve memberships. It skips the plugin's HTTP scope checks, so any
// member can read their own row.
type OrgMembershipAPI interface {
	GetMemberByUserID(ctx context.Context, actor *authulamodels.Actor, organizationID string, userID string) (*orgtypes.OrganizationMemberResponse, error)
}

type OrganizationsUseCase interface {
	GetMyMembership(ctx context.Context, actor *authulamodels.Actor, organizationID string) (*orgtypes.OrganizationMemberResponse, error)
}
