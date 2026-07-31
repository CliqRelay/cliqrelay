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
		ID:        uuid.New(),
		TeamID:    dto.TeamID,
		GuideID:   dto.GuideID,
		ViewerID:  viewerID,
		IPHash:    dto.IPHash,
		UserAgent: dto.UserAgent,
		ViewedAt:  dto.ViewedAt,
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
	q := r.db.NewSelect().
		ColumnExpr("gv.guide_id AS guide_id").
		ColumnExpr("COUNT(gv.id) AS view_count").
		ColumnExpr("MAX(g.duration_seconds) AS duration_seconds").
		TableExpr("guide_views AS gv").
		Join("JOIN guides AS g ON g.id = gv.guide_id").
		Where("gv.team_id = ?", teamID).
		Where("g.deleted_at IS NULL").
		GroupExpr("gv.guide_id")

	if since != nil {
		q = q.Where("gv.viewed_at >= ?", *since)
	}

	var stats []*types.GuideViewStats
	if err := q.Scan(ctx, &stats); err != nil {
		return nil, err
	}
	return stats, nil
}
