package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type WorkspaceService interface {
	Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateWorkspaceRequest) (*models.Workspace, error)
	GetAll(ctx context.Context, actor *authulamodels.Actor, filter *types.WorkspaceFilter) ([]*models.Workspace, error)
	GetByID(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (*models.Workspace, error)
	Update(ctx context.Context, actor *authulamodels.Actor, workspaceID string, req *types.UpdateWorkspaceRequest) (*models.Workspace, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, workspaceID string) error
}
