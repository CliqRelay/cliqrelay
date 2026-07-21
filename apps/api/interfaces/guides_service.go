package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService interface {
	Create(ctx context.Context, actor *authulamodels.Actor, workspaceID string, req *types.CreateGuideRequest) (*models.Guide, error)
	GetAll(ctx context.Context, actor *authulamodels.Actor, workspaceID string, status *string) ([]*models.Guide, error)
	GetByID(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Update(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Publish(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Unpublish(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Archive(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Unarchive(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	Restore(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	GetCount(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (int, error)
	PermanentlyDelete(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
	RecalculateDuration(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) (*models.Guide, error)
}
