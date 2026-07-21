package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type WorkspaceRepository interface {
	Create(ctx context.Context, dto *types.CreateWorkspaceDTO) (*models.Workspace, error)
	GetByID(ctx context.Context, id string) (*models.Workspace, error)
	GetAll(ctx context.Context, filter *types.WorkspaceFilter) ([]*models.Workspace, error)
	Update(ctx context.Context, dto *types.UpdateWorkspaceDTO) (*models.Workspace, error)
	Delete(ctx context.Context, id string) error
}
