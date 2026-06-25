package starred_guides

import (
	"context"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
)

type BunStarredGuidesRepository struct {
	db bun.IDB
}

func NewBunStarredGuidesRepository(db bun.IDB) *BunStarredGuidesRepository {
	return &BunStarredGuidesRepository{db: db}
}

func (r *BunStarredGuidesRepository) GetAllWithStarred(ctx context.Context, userID string) ([]*models.Guide, error) {
	type guideRow struct {
		models.Guide `bun:",inherit"`
		IsStarred    bool `bun:"is_starred"`
	}

	var rows []*guideRow
	err := r.db.NewRaw(`
		SELECT g.*, CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END as is_starred
		FROM guides g
		LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
		WHERE g.creator_id = ?
		AND g.deleted_at IS NULL
		AND g.status IN (?, ?, ?)
		ORDER BY g.updated_at DESC
	`, userID, userID, models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()).Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = row.IsStarred
	}
	return guides, nil
}

func (r *BunStarredGuidesRepository) GetAllByStatusWithStarred(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error) {
	type guideRow struct {
		models.Guide `bun:",inherit"`
		IsStarred    bool `bun:"is_starred"`
	}

	var rows []*guideRow
	err := r.db.NewRaw(`
		SELECT g.*, CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END as is_starred
		FROM guides g
		LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
		WHERE g.creator_id = ?
		AND g.deleted_at IS NULL
		AND g.status IN (?)
		ORDER BY g.updated_at DESC
	`, userID, userID, status).Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = row.IsStarred
	}
	return guides, nil
}

func (r *BunStarredGuidesRepository) GetStarredGuides(ctx context.Context, userID string) ([]*models.Guide, error) {
	type guideRow struct {
		models.Guide `bun:",inherit"`
		IsStarred    bool `bun:"is_starred"`
	}

	var rows []*guideRow
	err := r.db.NewRaw(`
		SELECT g.*, true as is_starred
		FROM guides g
		INNER JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?
		WHERE g.creator_id = ?
		AND g.deleted_at IS NULL
		AND g.status IN (?, ?, ?)
		ORDER BY g.updated_at DESC
	`, userID, userID, models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()).Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = row.IsStarred
	}
	return guides, nil
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
