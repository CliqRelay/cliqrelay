package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GuidesRepository interface {
	Create(ctx context.Context, userID string, data *types.CreateGuideDTO) (*models.Guide, error)
	GetAll(ctx context.Context, userID string) ([]*models.Guide, error)
	GetAllByStatus(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error)
	GetByID(ctx context.Context, userID string, id string) (*models.Guide, error)
	Update(ctx context.Context, userID string, data *types.UpdateGuideDTO) (*models.Guide, error)
	Delete(ctx context.Context, userID string, id string) (*models.Guide, error)
	Publish(ctx context.Context, userID string, id string) (*models.Guide, error)
	Unpublish(ctx context.Context, userID string, id string) (*models.Guide, error)
	Archive(ctx context.Context, userID string, id string) (*models.Guide, error)
	Unarchive(ctx context.Context, userID string, id string) (*models.Guide, error)
	Restore(ctx context.Context, userID string, id string) (*models.Guide, error)
	PermanentlyDelete(ctx context.Context, userID string, id string) (*models.Guide, error)
	GetCount(ctx context.Context, userID string) (int, error)
	UpdateDuration(ctx context.Context, userID string, id string, durationSeconds int) (*models.Guide, error)
	GetByIDAnyUser(ctx context.Context, id string) (*models.Guide, error)
	GetPendingPurge(ctx context.Context) ([]uuid.UUID, error)
	HardDelete(ctx context.Context, id string) error
}
