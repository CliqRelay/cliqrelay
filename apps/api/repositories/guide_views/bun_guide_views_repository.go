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
