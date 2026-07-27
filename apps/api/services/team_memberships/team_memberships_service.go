package team_memberships

import (
	"context"
	"fmt"

	authulamodels "github.com/Authula/authula/models"
	organizations "github.com/Authula/authula/plugins/organizations"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"

	"github.com/CliqRelay/cliqrelay/types"
)

type TeamMembershipsService struct {
	orgPluginAPI *organizations.API
}

func NewTeamMembershipsService(orgPluginAPI *organizations.API) *TeamMembershipsService {
	return &TeamMembershipsService{
		orgPluginAPI: orgPluginAPI,
	}
}

func (s *TeamMembershipsService) GetMemberTeamIDs(ctx context.Context, actor *authulamodels.Actor, orgID string, memberID string) ([]string, error) {
	allTeams, err := s.orgPluginAPI.GetAllTeams(ctx, actor, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list teams: %w", err)
	}

	var teamIDs []string
	for _, team := range allTeams {
		tm, err := s.orgPluginAPI.GetTeamMember(ctx, actor, orgID, team.ID, memberID)
		if err != nil || tm == nil {
			continue
		}
		teamIDs = append(teamIDs, team.ID)
	}
	if teamIDs == nil {
		teamIDs = []string{}
	}

	return teamIDs, nil
}

func (s *TeamMembershipsService) SetMemberTeamIDs(ctx context.Context, actor *authulamodels.Actor, orgID string, memberID string, teamIDs []string) (*types.UpdateTeamMembershipsResponse, error) {
	allTeams, err := s.orgPluginAPI.GetAllTeams(ctx, actor, orgID)
	if err != nil {
		return nil, fmt.Errorf("failed to list teams: %w", err)
	}

	desired := make(map[string]bool, len(teamIDs))
	for _, id := range teamIDs {
		desired[id] = true
	}

	teamMap := make(map[string]string, len(allTeams))
	for _, team := range allTeams {
		teamMap[team.ID] = team.Name
	}

	current := make(map[string]bool)
	for _, team := range allTeams {
		tm, err := s.orgPluginAPI.GetTeamMember(ctx, actor, orgID, team.ID, memberID)
		if err != nil || tm == nil {
			continue
		}
		current[team.ID] = true
	}

	var toAdd []string
	var toRemove []string
	for teamID := range desired {
		if _, ok := teamMap[teamID]; !ok {
			continue
		}
		if !current[teamID] {
			toAdd = append(toAdd, teamID)
		}
	}
	for teamID := range current {
		if !desired[teamID] {
			toRemove = append(toRemove, teamID)
		}
	}

	var errs []string
	for _, teamID := range toRemove {
		if err := s.orgPluginAPI.RemoveTeamMember(ctx, actor, orgID, teamID, memberID); err != nil {
			errs = append(errs, fmt.Sprintf("failed to remove from team %s: %v", teamMap[teamID], err))
		}
	}
	for _, teamID := range toAdd {
		if _, err := s.orgPluginAPI.AddTeamMember(ctx, actor, orgID, teamID, orgtypes.AddOrganizationTeamMemberRequest{MemberID: memberID}); err != nil {
			errs = append(errs, fmt.Sprintf("failed to add to team %s: %v", teamMap[teamID], err))
		}
	}

	appliedSet := make(map[string]bool)
	for _, id := range teamIDs {
		if _, ok := teamMap[id]; ok {
			appliedSet[id] = true
		}
	}
	for _, teamID := range toRemove {
		if errsContain(errs, teamMap[teamID]) {
			appliedSet[teamID] = true
		}
	}

	applied := make([]string, 0, len(appliedSet))
	for id := range appliedSet {
		applied = append(applied, id)
	}
	if applied == nil {
		applied = []string{}
	}

	return &types.UpdateTeamMembershipsResponse{
		TeamIDs: applied,
		Errors:  errs,
	}, nil
}

func errsContain(errs []string, substr string) bool {
	for _, e := range errs {
		for i := 0; i <= len(e)-len(substr); i++ {
			if e[i:i+len(substr)] == substr {
				return true
			}
		}
	}
	return false
}
