package auth

import (
	"context"
	"errors"
	"slices"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	orgconstants "github.com/Authula/authula/plugins/organizations/constants"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type DefaultAuthorizationService struct {
	organizationsApi organizationsplugin.API
}

func NewDefaultAuthorizationService(organizationsApi organizationsplugin.API) *DefaultAuthorizationService {
	return &DefaultAuthorizationService{organizationsApi: organizationsApi}
}

func (s *DefaultAuthorizationService) lookupActorOrgID(ctx context.Context, actor *authulamodels.Actor, teamID string) (string, error) {
	systemActor := &authulamodels.Actor{
		ID:     actor.ID,
		Type:   authulamodels.ActorMachine,
		Scopes: []string{"*"},
		Claims: map[string]any{},
	}

	orgs, err := s.organizationsApi.GetAllOrganizationsByOwner(ctx, systemActor)
	if err != nil {
		return "", err
	}

	for _, org := range orgs {
		teams, err := s.organizationsApi.GetAllTeams(ctx, systemActor, org.ID)
		if err != nil {
			continue
		}
		for _, team := range teams {
			if team.ID == teamID {
				return team.OrganizationID, nil
			}
		}
	}

	return "", errors.New("team not found in user's organizations")
}

func (s *DefaultAuthorizationService) isTeamMember(ctx context.Context, actor *authulamodels.Actor, orgID, teamID string) error {
	systemActor := &authulamodels.Actor{
		ID:     actor.ID,
		Type:   authulamodels.ActorMachine,
		Scopes: []string{"*"},
		Claims: map[string]any{
			"organization_id": orgID,
		},
	}

	member, err := s.organizationsApi.GetMemberByUserID(ctx, systemActor, orgID, actor.ID)
	if err != nil {
		return err
	}

	teamMember, err := s.organizationsApi.GetTeamMember(ctx, systemActor, orgID, teamID, member.ID)
	if err != nil {
		return err
	}
	if teamMember == nil {
		return errors.New("team member not found")
	}

	return nil
}

func (s *DefaultAuthorizationService) CanReadTeam(ctx context.Context, actor *authulamodels.Actor, orgID string, teamID string) error {
	return s.isTeamMember(ctx, actor, orgID, teamID)
}

func (s *DefaultAuthorizationService) CanCreateGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) error {
	orgID, err := s.lookupActorOrgID(ctx, actor, teamID)
	if err != nil {
		return constants.ErrForbidden
	}

	return s.isTeamMember(ctx, actor, orgID, teamID)
}

func (s *DefaultAuthorizationService) CanReadGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	orgID, err := s.lookupActorOrgID(ctx, actor, teamID)
	if err != nil {
		return constants.ErrForbidden
	}

	if err := s.isTeamMember(ctx, actor, orgID, teamID); err != nil {
		return constants.ErrForbidden
	}

	if guide.Visibility == models.VisibilityPrivate && actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}

	return nil
}

func (s *DefaultAuthorizationService) CanEditGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	orgID, err := s.lookupActorOrgID(ctx, actor, teamID)
	if err != nil {
		return constants.ErrForbidden
	}

	if err := s.isTeamMember(ctx, actor, orgID, teamID); err != nil {
		return constants.ErrForbidden
	}

	if guide.Visibility == models.VisibilityPrivate && actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}

	return nil
}

func (s *DefaultAuthorizationService) CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	orgID, err := s.lookupActorOrgID(ctx, actor, teamID)
	if err != nil {
		return constants.ErrForbidden
	}

	if err := s.isTeamMember(ctx, actor, orgID, teamID); err != nil {
		return constants.ErrForbidden
	}

	if actor.ID == guide.CreatorID {
		return nil
	}

	isAdmin := slices.Contains(actor.Scopes, orgconstants.All)
	if !isAdmin {
		return constants.ErrForbidden
	}

	if guide.Visibility == models.VisibilityPrivate {
		return constants.ErrForbidden
	}

	return nil
}

func (s *DefaultAuthorizationService) GuideListFilter(ctx context.Context, actor *authulamodels.Actor, teamID string) (*types.GuideFilter, error) {
	orgID, err := s.lookupActorOrgID(ctx, actor, teamID)
	if err != nil {
		return nil, constants.ErrForbidden
	}

	if err := s.isTeamMember(ctx, actor, orgID, teamID); err != nil {
		return nil, constants.ErrForbidden
	}

	return &types.GuideFilter{
		ViewerUserID:   &actor.ID,
		AccessibleOnly: true,
	}, nil
}
