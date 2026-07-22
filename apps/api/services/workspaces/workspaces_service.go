package workspaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type workspacesService struct {
	workspaceRepo interfaces.WorkspaceRepository
}

func NewWorkspacesService(workspaceRepo interfaces.WorkspaceRepository) interfaces.WorkspaceService {
	return &workspacesService{workspaceRepo: workspaceRepo}
}

func (s *workspacesService) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateWorkspaceRequest) (*models.Workspace, error) {
	if actor == nil {
		return nil, constants.ErrUnauthorized
	}

	wsType := models.WorkspaceTypePersonal
	if req.Type != nil {
		wsType = *req.Type
	}

	dto := &types.CreateWorkspaceDTO{
		OrganizationID: "", // Set by the caller or auto-created via AfterCreate hook
		Name:           req.Name,
		Type:           wsType,
		OwnerID:        actor.ID,
	}

	return s.workspaceRepo.Create(ctx, dto)
}

func (s *workspacesService) GetAll(ctx context.Context, actor *authulamodels.Actor, filter *types.WorkspaceFilter) ([]*models.Workspace, error) {
	if actor == nil {
		return nil, constants.ErrUnauthorized
	}

	return s.workspaceRepo.GetAll(ctx, filter)
}

func (s *workspacesService) GetByID(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (*models.Workspace, error) {
	if actor == nil {
		return nil, constants.ErrUnauthorized
	}

	ws, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, constants.ErrWorkspaceNotFound
	}

	return ws, nil
}

func (s *workspacesService) Update(ctx context.Context, actor *authulamodels.Actor, workspaceID string, req *types.UpdateWorkspaceRequest) (*models.Workspace, error) {
	if actor == nil {
		return nil, constants.ErrUnauthorized
	}

	ws, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if ws == nil {
		return nil, constants.ErrWorkspaceNotFound
	}

	dto := &types.UpdateWorkspaceDTO{
		ID:   workspaceID,
		Name: req.Name,
	}

	return s.workspaceRepo.Update(ctx, dto)
}

func (s *workspacesService) Delete(ctx context.Context, actor *authulamodels.Actor, workspaceID string) error {
	if actor == nil {
		return constants.ErrUnauthorized
	}

	ws, err := s.workspaceRepo.GetByID(ctx, workspaceID)
	if err != nil {
		return err
	}
	if ws == nil {
		return constants.ErrWorkspaceNotFound
	}

	return s.workspaceRepo.Delete(ctx, workspaceID)
}
