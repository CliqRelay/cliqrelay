package auth

import (
	"context"
	"errors"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"

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

func (s *DefaultAuthorizationService) CanCreateGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) error {
	if actor == nil {
		return constants.ErrForbidden
	}

	return nil
}

func (s *DefaultAuthorizationService) CanReadGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanEditGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, teamID string, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) GuideListFilter(ctx context.Context, actor *authulamodels.Actor, teamID string) (*types.GuideFilter, error) {
	if actor == nil {
		return &types.GuideFilter{}, nil
	}
	return &types.GuideFilter{
		CreatorID: &actor.ID,
	}, nil
}

func (s *DefaultAuthorizationService) isUserMemberOfOrg(ctx context.Context, actor *authulamodels.Actor, organizationID string) error {
	members, err := s.organizationsApi.GetAllMembers(ctx, actor, organizationID, 1, 1000)
	if err != nil {
		return err
	}

	for _, member := range members {
		if member.UserID == actor.ID {
			return nil
		}
	}

	return errors.New("you are not part of the organization that owns this team")
}
