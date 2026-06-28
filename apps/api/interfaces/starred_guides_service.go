package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService interface {
	Star(ctx context.Context, guideID string) error
	Unstar(ctx context.Context, guideID string) error
	GetStarredGuides(ctx context.Context) ([]*models.Guide, error)
}
