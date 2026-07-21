package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesRepository interface {
	Create(ctx context.Context, data *types.CreateGuideDTO) (*models.Guide, error)
	GetByID(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	GetAll(ctx context.Context, filter *types.GuideFilter) ([]*models.Guide, error)
	Update(ctx context.Context, data *types.UpdateGuideDTO) (*models.Guide, error)
	Delete(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	Publish(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	Unpublish(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	Archive(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	Unarchive(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	Restore(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	PermanentlyDelete(ctx context.Context, workspaceID string, id string) (*models.Guide, error)
	HardDelete(ctx context.Context, id string) error
	UpdateDuration(ctx context.Context, workspaceID string, id string, durationSeconds int) (*models.Guide, error)
	GetCount(ctx context.Context, filter *types.GuideFilter) (int, error)
	GetPendingPurge(ctx context.Context) ([]uuid.UUID, error)
}
