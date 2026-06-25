package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService interface {
	Create(ctx context.Context, userID string, req *types.CreateGuideRequest) (*models.Guide, error)
	GetAll(ctx context.Context, userID string, status *string) ([]*models.Guide, error)
	GetByID(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Update(ctx context.Context, userID string, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error)
	Delete(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Publish(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Unpublish(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Archive(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Unarchive(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	Restore(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	GetCount(ctx context.Context, userID string) (int, error)
	PermanentlyDelete(ctx context.Context, userID string, guideID string) (*models.Guide, error)
	RecalculateDuration(ctx context.Context, userID string, guideID string) (*models.Guide, error)
}
