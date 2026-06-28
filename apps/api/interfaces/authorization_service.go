package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type AuthorizationService interface {
	CanCreateGuide(ctx context.Context, actor *authulamodels.Actor) error
	CanReadGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	CanEditGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	CanDeleteGuide(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	GuideListFilter(ctx context.Context, actor *authulamodels.Actor) (*types.GuideFilter, error)
}
