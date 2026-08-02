package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService interface {
	Create(ctx context.Context, actor *authulamodels.Actor, teamID string, req *types.CreateGuideRequest) (*models.Guide, error)
	CreateDemoGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) (string, error)
	GetAll(ctx context.Context, teamID string, status *string, viewerUserID *string, excludeArchived bool, page, limit int, sortBy, sortDir string) ([]*models.Guide, int, error)
	GetByID(ctx context.Context, guideID string) (*models.Guide, error)
	GetByIDUnfiltered(ctx context.Context, guideID string) (*models.Guide, error)
	Update(ctx context.Context, actor *authulamodels.Actor, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Publish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Unpublish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Archive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Unarchive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error)
	Restore(ctx context.Context, guideID string) (*models.Guide, error)
	GetCount(ctx context.Context, teamID string, viewerUserID *string) (int, error)
	GetOrgCount(ctx context.Context, orgID string, viewerUserID *string) (int, error)
	PermanentlyDelete(ctx context.Context, guideID string) (*models.Guide, error)
	RecalculateDuration(ctx context.Context, guideID string) (*models.Guide, error)
	BulkDelete(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error)
	BulkRestore(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error)
	BulkPermanentlyDelete(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error)
}
