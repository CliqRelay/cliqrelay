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

func (r *BunStarredGuidesRepository) GetAll(ctx context.Context, filter *types.GuideFilter) ([]*types.GuideWithStarred, int, error) {
	if filter == nil || filter.ViewerUserID == nil {
		return []*types.GuideWithStarred{}, 0, nil
	}

	var rows []*types.GuideWithStarred

	query := r.db.NewSelect().
		ColumnExpr("g.*").
		ColumnExpr("u.id AS cr_id").
		ColumnExpr("u.name AS cr_name").
		ColumnExpr("u.email AS cr_email").
		ColumnExpr("u.image AS cr_image").
		ColumnExpr("u.metadata AS cr_metadata").
		ColumnExpr("true AS is_starred").
		ColumnExpr("COUNT(*) OVER() AS total_count").
		TableExpr("starred_guides sg").
		Join("INNER JOIN guides g ON g.id = sg.guide_id").
		Join("LEFT JOIN users u ON u.id = g.creator_id").
		Where("sg.user_id = ?", *filter.ViewerUserID)

	if filter.Status != nil {
		query = query.Where("g.status = ?", *filter.Status)
	} else if filter.DeletedOnly {
		query = query.Where("g.deleted_at IS NOT NULL")
		query = query.Where("g.status = ?", models.StatusDeleted)
	} else {
		query = query.Where("g.deleted_at IS NULL")
		if filter.PublishedOnly {
			query = query.Where("g.status = ?", models.StatusPublished)
		} else if filter.ArchivedOnly {
			query = query.Where("g.status = ?", models.StatusArchived.ToString())
		} else {
			query = query.Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()}))
		}
	}

	if filter.Search != nil {
		query = query.Where("g.title ILIKE ?", "%"+*filter.Search+"%")
	}

	if filter.AccessibleOnly && filter.ViewerUserID != nil {
		query = query.Where("(g.creator_id = ? OR g.visibility IN (?))", *filter.ViewerUserID, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))
	}

	if filter.TeamID != nil {
		query = query.Where("g.team_id = ?", *filter.TeamID)
	}

	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	err := query.Order("g.updated_at DESC").Scan(ctx, &rows)
	if err != nil {
		return nil, 0, err
	}

	total := 0
	if len(rows) > 0 {
		total = rows[0].TotalCount
	}

	return rows, total, nil
}

func (r *BunStarredGuidesRepository) Star(ctx context.Context, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewInsert().
		Model(&models.StarredGuide{UserID: userID, GuideID: guideID}).
		On("CONFLICT (user_id, guide_id) DO NOTHING").
		Exec(ctx)
	return err
}

func (r *BunStarredGuidesRepository) IsStarred(ctx context.Context, guideID uuid.UUID, userID string) (bool, error) {
	return r.db.NewSelect().
		Model(&models.StarredGuide{}).
		Where("guide_id = ? AND user_id = ?", guideID, userID).
		Exists(ctx)
}

func (r *BunStarredGuidesRepository) Unstar(ctx context.Context, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model(&models.StarredGuide{}).
		Where("user_id = ?", userID).
		Where("guide_id = ?", guideID).
		Exec(ctx)
	return err
}
