package auth

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type DefaultAuthorizationService struct{}

func NewDefaultAuthorizationService() *DefaultAuthorizationService {
	return &DefaultAuthorizationService{}
}

func (s *DefaultAuthorizationService) CanCreateGuide(ctx context.Context, actor *authulamodels.Actor) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanReadGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanEditGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error {
	if actor == nil {
		return constants.ErrForbidden
	}
	if actor.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) GuideListFilter(ctx context.Context, actor *authulamodels.Actor) (*types.GuideFilter, error) {
	if actor == nil {
		return &types.GuideFilter{}, nil
	}
	return &types.GuideFilter{
		CreatorID: &actor.ID,
	}, nil
}
