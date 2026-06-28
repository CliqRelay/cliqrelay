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
	var rows []*types.GuideWithStarred

	query := r.db.NewRaw(`
		SELECT g.*, CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END as is_starred
		FROM guides g
		LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
		WHERE g.deleted_at IS NULL
	`, filter.ViewerUserID)

	var conditions []any
	if filter.CreatorID != nil && *filter.CreatorID != "" {
		conditions = append(conditions, *filter.CreatorID)
		query = r.db.NewRaw(`
			SELECT g.*, CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END as is_starred
			FROM guides g
			LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
			WHERE g.creator_id = ?
			AND g.deleted_at IS NULL
		`, filter.ViewerUserID, *filter.CreatorID)
	}

	if filter.Status != nil {
		query = r.db.NewRaw(`
			SELECT g.*, CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END as is_starred
			FROM guides g
			LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
			WHERE g.creator_id = ?
			AND g.deleted_at IS NULL
			AND g.status IN (?)
		`, filter.ViewerUserID, *filter.CreatorID, *filter.Status)
	}

	err := query.Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *BunStarredGuidesRepository) Star(ctx context.Context, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewInsert().
		Model(&models.StarredGuide{UserID: userID, GuideID: guideID}).
		On("CONFLICT (user_id, guide_id) DO NOTHING").
		Exec(ctx)
	return err
}

func (r *BunStarredGuidesRepository) Unstar(ctx context.Context, userID string, guideID uuid.UUID) error {
	_, err := r.db.NewDelete().
		Model(&models.StarredGuide{}).
		Where("user_id = ?", userID).
		Where("guide_id = ?", guideID).
		Exec(ctx)
	return err
}
