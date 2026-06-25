package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService interface {
	Star(ctx context.Context, userID string, guideID string) error
	Unstar(ctx context.Context, userID string, guideID string) error
	GetStarredGuides(ctx context.Context, userID string) ([]*models.Guide, error)
}
