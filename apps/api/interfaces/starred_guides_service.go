package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService interface {
	Star(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	Unstar(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	GetStarredGuides(ctx context.Context, actor *authulamodels.Actor) ([]*models.Guide, error)
}
