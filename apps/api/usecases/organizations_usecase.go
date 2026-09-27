package usecases

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

var _ interfaces.OrgMembershipAPI = (*organizationsplugin.API)(nil)

type OrganizationsUseCase struct {
	orgMembershipAPI interfaces.OrgMembershipAPI
}

func NewOrganizationsUseCase(orgMembershipAPI interfaces.OrgMembershipAPI) *OrganizationsUseCase {
	return &OrganizationsUseCase{orgMembershipAPI: orgMembershipAPI}
}

// GetMyMembership collapses every lookup failure into ErrOrganizationMemberNotFound
// so non-members cannot probe which organization ids exist.
func (uc *OrganizationsUseCase) GetMyMembership(ctx context.Context, actor *authulamodels.Actor, organizationID string) (*orgtypes.OrganizationMemberResponse, error) {
	if actor == nil || actor.ID == "" {
		return nil, constants.ErrUnauthorized
	}

	member, err := uc.orgMembershipAPI.GetMemberByUserID(ctx, actor, organizationID, actor.ID)
	if err != nil || member == nil {
		return nil, constants.ErrOrganizationMemberNotFound
	}

	return member, nil
}
