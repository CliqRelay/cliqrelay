package auth

import (
	"context"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type DefaultAuthorizationService struct{}

func NewDefaultAuthorizationService() *DefaultAuthorizationService {
	return &DefaultAuthorizationService{}
}

func (s *DefaultAuthorizationService) CanCreateGuide(ctx context.Context, identity *models.Identity) error {
	if identity == nil {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanReadGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	if identity == nil {
		return constants.ErrForbidden
	}
	if identity.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanEditGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	if identity == nil {
		return constants.ErrForbidden
	}
	if identity.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) CanDeleteGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error {
	if identity == nil {
		return constants.ErrForbidden
	}
	if identity.ID != guide.CreatorID {
		return constants.ErrForbidden
	}
	return nil
}

func (s *DefaultAuthorizationService) GuideListFilter(ctx context.Context, identity *models.Identity) (*types.GuideFilter, error) {
	if identity == nil {
		return &types.GuideFilter{}, nil
	}
	return &types.GuideFilter{
		CreatorID: &identity.ID,
	}, nil
}
