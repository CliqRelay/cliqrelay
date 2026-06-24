package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/internal/models"
)

type GuidesCacheService interface {
	Get(ctx context.Context, guideID string) (*models.Guide, error)
	Set(ctx context.Context, guide *models.Guide) error
	Invalidate(ctx context.Context, guideID string) error
}
