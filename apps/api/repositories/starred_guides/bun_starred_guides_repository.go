package starred_guides

import (
	"context"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type BunStarredGuidesRepository struct {
	db bun.IDB
}

func NewBunStarredGuidesRepository(db bun.IDB) *BunStarredGuidesRepository {
	return &BunStarredGuidesRepository{db: db}
}

func (r *BunStarredGuidesRepository) GetAll(ctx context.Context, filter *types.GuideFilter) ([]*types.GuideWithStarred, error) {
	if filter == nil || filter.ViewerUserID == nil {
		return []*types.GuideWithStarred{}, nil
	}

	var rows []*types.GuideWithStarred

	query := r.db.NewSelect().
		ColumnExpr("g.*").
		ColumnExpr("true AS is_starred").
		TableExpr("starred_guides sg").
		Join("INNER JOIN guides g ON g.id = sg.guide_id").
		Where("sg.user_id = ?", *filter.ViewerUserID)

	if filter.WorkspaceID != nil {
		query = query.Where("sg.workspace_id = ?", *filter.WorkspaceID)
	}

	if filter.Status != nil {
		query = query.Where("g.status = ?", *filter.Status)
	} else if filter.IncludeDeleted {
		query = query.Where("g.deleted_at IS NOT NULL")
		query = query.Where("g.status = ?", models.StatusDeleted)
	} else {
		query = query.Where("g.deleted_at IS NULL")
		if filter.PublishedOnly {
			query = query.Where("g.status = ?", models.StatusPublished)
		} else if filter.IncludeArchived {
			query = query.Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()}))
		} else {
			query = query.Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString()}))
		}
	}

	if filter.Search != nil {
		query = query.Where("g.title ILIKE ?", "%"+*filter.Search+"%")
	}

	err := query.Order("g.updated_at DESC").Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *BunStarredGuidesRepository) Star(ctx context.Context, workspaceID string, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewInsert().
		Model(&models.StarredGuide{UserID: userID, GuideID: guideID, WorkspaceID: uuid.MustParse(workspaceID)}).
		On("CONFLICT (user_id, guide_id) DO NOTHING").
		Exec(ctx)
	return err
}

func (r *BunStarredGuidesRepository) Unstar(ctx context.Context, workspaceID string, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model(&models.StarredGuide{}).
		Where("user_id = ?", userID).
		Where("guide_id = ?", guideID).
		Where("workspace_id = ?", workspaceID).
		Exec(ctx)
	return err
}
