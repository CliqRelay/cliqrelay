package guideviews

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type BunGuideViewsRepository struct {
	db bun.IDB
}

func NewBunGuideViewsRepository(db bun.IDB) *BunGuideViewsRepository {
	return &BunGuideViewsRepository{db: db}
}

func (r *BunGuideViewsRepository) Create(ctx context.Context, dto *types.CreateGuideViewDTO) error {
	var viewerID *string
	if dto.ViewerID != nil {
		s := dto.ViewerID.String()
		viewerID = &s
	}

	view := &models.GuideView{
		ID:              uuid.New(),
		TeamID:          dto.TeamID,
		GuideID:         dto.GuideID,
		ViewerID:        viewerID,
		IPHash:          dto.IPHash,
		UserAgent:       dto.UserAgent,
		DurationSeconds: dto.DurationSeconds,
		ViewedAt:        dto.ViewedAt,
	}

	_, err := r.db.NewInsert().Model(view).Exec(ctx)
	return err
}

func (r *BunGuideViewsRepository) GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error) {
	q := r.db.NewSelect().Model((*models.GuideView)(nil)).Where("team_id = ?", teamID)
	if since != nil {
		q = q.Where("viewed_at >= ?", *since)
	}
	return q.Count(ctx)
}

func (r *BunGuideViewsRepository) GetTimeSavedByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) ([]*types.GuideViewStats, error) {
	// Grouped by the duration snapshotted onto each view rather than by guide: the
	// metric is historical, so it neither follows later edits to a guide nor drops
	// when a guide is trashed.
	q := r.db.NewSelect().
		ColumnExpr("COUNT(id) AS view_count").
		ColumnExpr("duration_seconds AS duration_seconds").
		TableExpr("guide_views").
		Where("team_id = ?", teamID).
		GroupExpr("duration_seconds")

	if since != nil {
		q = q.Where("viewed_at >= ?", *since)
	}

	var stats []*types.GuideViewStats
	if err := q.Scan(ctx, &stats); err != nil {
		return nil, err
	}
	return stats, nil
}
