package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type AuthorizationService interface {
	CanCreateGuide(ctx context.Context, identity *models.Identity) error
	CanReadGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error
	CanEditGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error
	CanDeleteGuide(ctx context.Context, identity *models.Identity, guide *models.Guide) error
	GuideListFilter(ctx context.Context, identity *models.Identity) (*types.GuideFilter, error)
}
