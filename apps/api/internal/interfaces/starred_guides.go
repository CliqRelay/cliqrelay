package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/internal/models"
)

type StarredGuidesRepository interface {
	GetAllWithStarred(ctx context.Context, userID string) ([]*models.Guide, error)
	GetStarredGuides(ctx context.Context, userID string) ([]*models.Guide, error)
	GetAllByStatusWithStarred(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error)
	Star(ctx context.Context, userID string, guideID uuid.UUID) error
	Unstar(ctx context.Context, userID string, guideID uuid.UUID) error
}
