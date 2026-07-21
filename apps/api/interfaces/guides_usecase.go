package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesUseCase interface {
	Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateGuideRequest) (*models.Guide, error)
	CreateDemoGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) (string, error)
	List(ctx context.Context, actor *authulamodels.Actor, teamID string, status *string) ([]*models.Guide, error)
	Get(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Update(ctx context.Context, actor *authulamodels.Actor, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	GetCount(ctx context.Context, actor *authulamodels.Actor, teamID string) (int, error)
	Publish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Unpublish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Archive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Unarchive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Restore(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	PermanentlyDelete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	RecalculateDuration(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Star(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	Unstar(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	GetStarred(ctx context.Context, actor *authulamodels.Actor, teamID string) ([]*models.Guide, error)
}
