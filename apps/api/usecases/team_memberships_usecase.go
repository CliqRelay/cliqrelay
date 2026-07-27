package usecases

import (
	"context"
	"fmt"

	authulamodels "github.com/Authula/authula/models"
	organizations "github.com/Authula/authula/plugins/organizations"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type TeamMembershipsUseCase struct {
	orgPluginAPI *organizations.API
	service      interfaces.TeamMembershipsService
}

func NewTeamMembershipsUseCase(orgPluginAPI *organizations.API, service interfaces.TeamMembershipsService) *TeamMembershipsUseCase {
	return &TeamMembershipsUseCase{
		orgPluginAPI: orgPluginAPI,
		service:      service,
	}
}

func (uc *TeamMembershipsUseCase) Get(ctx context.Context, actor *authulamodels.Actor, memberID string, orgID string) (*types.GetTeamMembershipsResponse, error) {
	if err := uc.verifyAdminOrOwner(ctx, actor, orgID); err != nil {
		return nil, err
	}

	if _, err := uc.orgPluginAPI.GetMember(ctx, actor, orgID, memberID); err != nil {
		return nil, fmt.Errorf("member not found in organization")
	}

	teamIDs, err := uc.service.GetMemberTeamIDs(ctx, actor, orgID, memberID)
	if err != nil {
		return nil, err
	}

	return &types.GetTeamMembershipsResponse{TeamIDs: teamIDs}, nil
}

func (uc *TeamMembershipsUseCase) Update(ctx context.Context, actor *authulamodels.Actor, memberID string, req *types.UpdateTeamMembershipsRequest) (*types.UpdateTeamMembershipsResponse, error) {
	if err := uc.verifyAdminOrOwner(ctx, actor, req.OrganizationID); err != nil {
		return nil, err
	}

	if _, err := uc.orgPluginAPI.GetMember(ctx, actor, req.OrganizationID, memberID); err != nil {
		return nil, fmt.Errorf("member not found in organization")
	}

	return uc.service.SetMemberTeamIDs(ctx, actor, req.OrganizationID, memberID, req.TeamIDs)
}

func (uc *TeamMembershipsUseCase) verifyAdminOrOwner(ctx context.Context, actor *authulamodels.Actor, orgID string) error {
	org, err := uc.orgPluginAPI.GetOrganizationByID(ctx, actor, orgID)
	if err != nil {
		return fmt.Errorf("organization not found")
	}

	if org.OwnerID == actor.ID {
		return nil
	}

	member, err := uc.orgPluginAPI.GetMemberByUserID(ctx, actor, orgID, actor.ID)
	if err != nil || member == nil || member.Role != "admin" {
		return constants.ErrForbidden
	}

	return nil
}
