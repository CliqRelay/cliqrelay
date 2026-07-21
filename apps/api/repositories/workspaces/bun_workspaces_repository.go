package workspaces

import (
	"context"

	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type bunWorkspacesRepository struct {
	db bun.IDB
}

func NewBunWorkspacesRepository(db bun.IDB) *bunWorkspacesRepository {
	return &bunWorkspacesRepository{db: db}
}

func (r *bunWorkspacesRepository) Create(ctx context.Context, dto *types.CreateWorkspaceDTO) (*models.Workspace, error) {
	ws := &models.Workspace{
		OrganizationID: dto.OrganizationID,
		Name:           dto.Name,
		Type:           dto.Type,
		OwnerID:        dto.OwnerID,
	}
	_, err := r.db.NewInsert().Model(ws).Returning("*").Exec(ctx)
	if err != nil {
		return nil, err
	}
	return ws, nil
}

func (r *bunWorkspacesRepository) GetByID(ctx context.Context, id string) (*models.Workspace, error) {
	ws := new(models.Workspace)
	err := r.db.NewSelect().Model(ws).Where("id = ?", id).Scan(ctx)
	if err != nil {
		if err.Error() == "sql: no rows in result set" {
			return nil, nil
		}
		return nil, err
	}
	return ws, nil
}

func (r *bunWorkspacesRepository) GetAll(ctx context.Context, filter *types.WorkspaceFilter) ([]*models.Workspace, error) {
	query := r.db.NewSelect().Model((*models.Workspace)(nil))

	if filter != nil && filter.Type != nil {
		query = query.Where("type = ?", string(*filter.Type))
	}

	var workspaces []*models.Workspace
	err := query.Scan(ctx, &workspaces)
	if err != nil {
		return nil, err
	}
	return workspaces, nil
}

func (r *bunWorkspacesRepository) Update(ctx context.Context, dto *types.UpdateWorkspaceDTO) (*models.Workspace, error) {
	ws := &models.Workspace{}
	_, err := r.db.NewUpdate().
		Model(ws).
		Set("name = COALESCE(?name, name)").
		Where("id = ?", dto.ID).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}
	return ws, nil
}

func (r *bunWorkspacesRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.NewDelete().Model((*models.Workspace)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}
