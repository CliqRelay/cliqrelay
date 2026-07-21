package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService interface {
	Create(ctx context.Context, workspaceID string, req *types.CreateGuideRequest) (*models.Guide, error)
	GetAll(ctx context.Context, workspaceID string, status *string) ([]*models.Guide, error)
	GetByID(ctx context.Context, guideID string) (*models.Guide, error)
	Update(ctx context.Context, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error)
	Delete(ctx context.Context, guideID string) (*models.Guide, error)
	Publish(ctx context.Context, guideID string) (*models.Guide, error)
	Unpublish(ctx context.Context, guideID string) (*models.Guide, error)
	Archive(ctx context.Context, guideID string) (*models.Guide, error)
	Unarchive(ctx context.Context, guideID string) (*models.Guide, error)
	Restore(ctx context.Context, guideID string) (*models.Guide, error)
	GetCount(ctx context.Context, workspaceID string) (int, error)
	PermanentlyDelete(ctx context.Context, guideID string) (*models.Guide, error)
	RecalculateDuration(ctx context.Context, guideID string) (*models.Guide, error)
}
