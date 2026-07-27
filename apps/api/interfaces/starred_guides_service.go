package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StarredGuidesService interface {
	Star(ctx context.Context, userID string, guideID string) error
	Unstar(ctx context.Context, userID string, guideID string) error
	GetStarredGuides(ctx context.Context, filter *types.GuideFilter) ([]*models.Guide, int, error)
	IsStarred(ctx context.Context, guideID string, userID string) (bool, error)
}
