package auth

import (
	"context"
	"strings"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	orgconstants "github.com/Authula/authula/plugins/organizations/constants"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type DefaultAuthorizationService struct {
	// organizationsApi is still needed by GuideListFilterByOrganization, which is
	// already a single lookup and so was left on the plugin API.
	organizationsApi organizationsplugin.API
	teamsService     interfaces.TeamsService
}

func NewDefaultAuthorizationService(organizationsApi organizationsplugin.API, teamsService interfaces.TeamsService) *DefaultAuthorizationService {
	return &DefaultAuthorizationService{organizationsApi: organizationsApi, teamsService: teamsService}
}

// resolveAccessibleTeam returns the team if the actor can reach it, (nil, nil) if
// they cannot, and an error only when the lookup itself failed. Callers substitute
// their own denial error for the (nil, nil) case, so an infrastructure failure
// propagates as a 500 rather than telling every user they have lost access.
func (s *DefaultAuthorizationService) resolveAccessibleTeam(ctx context.Context, actor *authulamodels.Actor, teamID string) (*models.Team, error) {
	if actor == nil || actor.ID == "" {
		return nil, constants.ErrUnauthorized
	}

	return s.teamsService.GetAccessibleByUserID(ctx, actor.ID, teamID)
}

func (s *DefaultAuthorizationService) CanReadTeam(ctx context.Context, actor *authulamodels.Actor, orgID string, teamID string) error {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return constants.ErrTeamAccessDenied
	}

	// Denial rather than a not-found, so this does not leak whether teams exist in
	// organizations the actor cannot see.
	if orgID != "" && team.OrganizationID != orgID {
		return constants.ErrTeamAccessDenied
	}

	return nil
}

func hasScope(scopes []string, required string) bool {
	for _, scope := range scopes {
		if scope == required || scope == "*" {
			return true
		}
		if before, ok := strings.CutSuffix(scope, "*"); ok {
			prefix := before
			if strings.HasPrefix(required, prefix) {
				return true
			}
		}
	}
	return false
}

func (s *DefaultAuthorizationService) CanCreateGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) error {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return constants.ErrTeamAccessDenied
	}

	if !hasScope(actor.Scopes, constants.GuidesCreatePermission) {
		return constants.ErrGuideCreateDenied
	}

	return nil
}

func (s *DefaultAuthorizationService) CanReadGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return constants.ErrGuideAccessDenied
	}

	if !hasScope(actor.Scopes, constants.GuidesReadPermission) {
		return constants.ErrGuideAccessDenied
	}

	if guide.Visibility == models.VisibilityPrivate && (guide.CreatorID == nil || *guide.CreatorID != actor.ID) {
		return constants.ErrGuideReadDenied
	}

	return nil
}

func (s *DefaultAuthorizationService) CanEditGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return constants.ErrGuideEditDenied
	}

	if !hasScope(actor.Scopes, constants.GuidesEditPermission) {
		return constants.ErrGuideEditDenied
	}

	if guide.Visibility == models.VisibilityPrivate && (guide.CreatorID == nil || *guide.CreatorID != actor.ID) {
		return constants.ErrGuideEditDenied
	}

	return nil
}

func (s *DefaultAuthorizationService) CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return constants.ErrGuideDeleteDenied
	}

	if guide.CreatorID != nil && *guide.CreatorID == actor.ID {
		return nil
	}

	if !hasScope(actor.Scopes, constants.GuidesDeletePermission) {
		return constants.ErrGuideDeleteDenied
	}

	isAdmin := hasScope(actor.Scopes, orgconstants.OrganizationsAllPermission)
	if !isAdmin {
		return constants.ErrGuideDeleteDenied
	}

	if guide.Visibility == models.VisibilityPrivate {
		return constants.ErrGuideDeleteDenied
	}

	return nil
}

func (s *DefaultAuthorizationService) CanBulkGuideAction(ctx context.Context, actor *authulamodels.Actor, action string) error {
	switch action {
	case "restore":
		if !hasScope(actor.Scopes, constants.GuidesEditPermission) {
			return constants.ErrGuideEditDenied
		}
	case "delete", "permanently-delete":
		if !hasScope(actor.Scopes, constants.GuidesDeletePermission) {
			return constants.ErrGuideDeleteDenied
		}
	default:
		return nil
	}

	return nil
}

func (s *DefaultAuthorizationService) GuideListFilter(ctx context.Context, actor *authulamodels.Actor, teamID string) (*types.GuideFilter, error) {
	team, err := s.resolveAccessibleTeam(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}
	if team == nil {
		return nil, constants.ErrGuideAccessDenied
	}

	if !hasScope(actor.Scopes, constants.GuidesReadPermission) {
		return nil, constants.ErrGuideAccessDenied
	}

	return &types.GuideFilter{
		ViewerUserID:   &actor.ID,
		AccessibleOnly: true,
	}, nil
}

func (s *DefaultAuthorizationService) GuideListFilterByOrganization(ctx context.Context, actor *authulamodels.Actor, orgID string) (*types.GuideFilter, error) {
	systemActor := &authulamodels.Actor{
		ID:     actor.ID,
		Type:   authulamodels.ActorMachine,
		Scopes: []string{"*"},
		Claims: map[string]any{
			"organization_id": orgID,
		},
	}

	org, err := s.organizationsApi.GetOrganizationByID(ctx, systemActor, orgID)
	if err != nil || org == nil {
		return nil, constants.ErrOrganizationNotFound
	}

	if org.OwnerID != actor.ID {
		member, err := s.organizationsApi.GetMemberByUserID(ctx, systemActor, orgID, actor.ID)
		if err != nil || member == nil {
			return nil, constants.ErrOrganizationAccessDenied
		}
	}

	if !hasScope(actor.Scopes, constants.GuidesReadPermission) {
		return nil, constants.ErrGuideAccessDenied
	}

	return &types.GuideFilter{
		ViewerUserID:   &actor.ID,
		AccessibleOnly: true,
	}, nil
}
