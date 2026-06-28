package auth

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
)

type DefaultIdentityService struct{}

func NewDefaultIdentityService() *DefaultIdentityService {
	return &DefaultIdentityService{}
}

func (s *DefaultIdentityService) Current(ctx context.Context) *models.Identity {
	reqCtx, ok := authulamodels.GetRequestContext(ctx)
	if !ok {
		return nil
	}

	return &models.Identity{
		Kind:   identityTypeFromActorType(reqCtx.Actor.Type),
		ID:     reqCtx.Actor.ID,
		Claims: nil,
	}
}

func identityTypeFromActorType(actorType authulamodels.ActorType) models.IdentityType {
	switch actorType {
	case authulamodels.ActorUser:
		return models.IdentityTypeUser
	default:
		return models.IdentityTypeUser
	}
}
