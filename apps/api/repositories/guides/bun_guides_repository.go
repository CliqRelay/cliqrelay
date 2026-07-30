package guides

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type BunGuidesRepository struct {
	db bun.IDB
}

func NewBunGuidesRepository(db bun.IDB) *BunGuidesRepository {
	return &BunGuidesRepository{db: db}
}

func (r *BunGuidesRepository) Create(ctx context.Context, dto *types.CreateGuideDTO) (*models.Guide, error) {
	guide := &models.Guide{
		ID:          uuid.New(),
		TeamID:      dto.TeamID,
		CreatorID:   dto.CreatorID,
		Title:       dto.Title,
		Description: dto.Description,
		Status:      models.StatusDraft,
		Visibility:  models.VisibilityPrivate,
	}

	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.NewInsert().
			Model(guide).
			Exec(ctx)
		if err != nil {
			return err
		}

		err = tx.NewSelect().
			Model(guide).
			WherePK().
			Scan(ctx)

		return err
	})

	return guide, err
}

func (r *BunGuidesRepository) GetAll(ctx context.Context, filter *types.GuideFilter) ([]*models.Guide, int, error) {
	var rows []*types.GuideWithStarred
	query := r.db.NewSelect().
		ColumnExpr("g.*").
		ColumnExpr("u.id AS cr_id").
		ColumnExpr("u.name AS cr_name").
		ColumnExpr("u.email AS cr_email").
		ColumnExpr("u.image AS cr_image").
		ColumnExpr("u.metadata AS cr_metadata").
		ColumnExpr("COUNT(*) OVER() AS total_count").
		TableExpr("guides g").
		Join("LEFT JOIN users u ON u.id = g.creator_id")

	if filter != nil {
		if filter.ViewerUserID != nil {
			query = query.
				ColumnExpr("CASE WHEN sg.user_id IS NOT NULL THEN true ELSE false END AS is_starred").
				Join("LEFT JOIN starred_guides sg ON sg.guide_id = g.id AND sg.user_id = ?", *filter.ViewerUserID)
		} else {
			query = query.ColumnExpr("false AS is_starred")
		}

		if filter.TeamID != nil {
			query = query.Where("g.team_id = ?", *filter.TeamID)
		}
		if filter.AccessibleOnly && filter.ViewerUserID != nil {
			query = query.Where("(g.creator_id = ? OR g.visibility IN (?))", *filter.ViewerUserID, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))
		}
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
			} else if filter.ExcludeArchived {
				query = query.Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString()}))
			} else {
				query = query.Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()}))
			}
		}
		if filter.Search != nil {
			query = query.Where("g.title ILIKE ?", "%"+*filter.Search+"%")
		}
		if filter.CreatedBefore != nil {
			query = query.Where("g.created_at < ?", *filter.CreatedBefore)
		}
		if filter.CreatedAfter != nil {
			query = query.Where("g.created_at > ?", *filter.CreatedAfter)
		}
		if filter.Limit > 0 {
			query = query.Limit(filter.Limit)
		}
		if filter.Offset > 0 {
			query = query.Offset(filter.Offset)
		}
	} else {
		query = query.ColumnExpr("false AS is_starred").
			Where("g.deleted_at IS NULL").
			Where("g.status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString()}))
	}

	if filter != nil && filter.SortBy != "" {
		order := "ASC"
		if filter.SortDesc {
			order = "DESC"
		}
		query = query.Order(fmt.Sprintf("g.%s %s", filter.SortBy, order))
	} else {
		query = query.Order("g.updated_at DESC")
	}

	err := query.Scan(ctx, &rows)
	if err != nil {
		return nil, 0, err
	}

	total := 0
	if len(rows) > 0 {
		total = rows[0].TotalCount
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = row.IsStarred
		if row.CrID != nil {
			guides[i].Creator = &models.GuideCreator{
				ID:       *row.CrID,
				Name:     row.CrName,
				Email:    row.CrEmail,
				Image:    row.CrImage,
				Metadata: row.CrMetadata,
			}
		}
	}

	return guides, total, nil
}

func (r *BunGuidesRepository) GetByID(ctx context.Context, id string) (*models.Guide, error) {
	type guideWithCreator struct {
		models.Guide
		CrID       *string        `bun:"cr_id"`
		CrName     string         `bun:"cr_name"`
		CrEmail    string         `bun:"cr_email"`
		CrImage    *string        `bun:"cr_image"`
		CrMetadata map[string]any `bun:"cr_metadata"`
	}

	var row guideWithCreator
	err := r.db.NewSelect().
		ColumnExpr("g.*").
		ColumnExpr("u.id AS cr_id").
		ColumnExpr("u.name AS cr_name").
		ColumnExpr("u.email AS cr_email").
		ColumnExpr("u.image AS cr_image").
		ColumnExpr("u.metadata AS cr_metadata").
		TableExpr("guides g").
		Join("LEFT JOIN users u ON u.id = g.creator_id").
		Where("g.id = ?", id).
		Scan(ctx, &row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide := &row.Guide
	if row.CrID != nil {
		guide.Creator = &models.GuideCreator{
			ID:       *row.CrID,
			Name:     row.CrName,
			Email:    row.CrEmail,
			Image:    row.CrImage,
			Metadata: row.CrMetadata,
		}
	}

	return guide, nil
}

func (r *BunGuidesRepository) Update(ctx context.Context, data *types.UpdateGuideDTO) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", data.ID).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if data.Title != nil {
		guide.Title = *data.Title
	}
	if data.Description != nil {
		guide.Description = data.Description
	}
	if data.Visibility != nil {
		guide.Visibility = *data.Visibility
	}

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	err = r.db.NewSelect().
		Model(guide).
		WherePK().
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) Delete(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}
	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusDeleted
	now := time.Now()
	guide.DeletedAt = &now
	guide.PublishedAt = nil
	guide.ArchivedAt = nil
	guide.RestoredAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) Publish(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusPublished
	guide.Visibility = models.VisibilityTeam
	now := time.Now()
	guide.PublishedAt = &now
	guide.ArchivedAt = nil
	guide.DeletedAt = nil
	guide.RestoredAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) Unpublish(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusDraft
	guide.PublishedAt = nil
	guide.ArchivedAt = nil
	guide.DeletedAt = nil
	guide.RestoredAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) Archive(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusArchived
	now := time.Now()
	guide.ArchivedAt = &now
	guide.PublishedAt = nil
	guide.DeletedAt = nil
	guide.RestoredAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) Unarchive(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusDraft
	now := time.Now()
	guide.RestoredAt = &now
	guide.ArchivedAt = nil
	guide.PublishedAt = nil
	guide.DeletedAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) PermanentlyDelete(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}
	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NOT NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.PurgeRequestedAt = new(time.Now().UTC())

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) GetCount(ctx context.Context, filter *types.GuideFilter) (int, error) {
	query := r.db.NewSelect().Model((*models.Guide)(nil))

	if filter != nil {
		if filter.TeamID != nil {
			query = query.Where("team_id = ?", *filter.TeamID)
		}
		if filter.AccessibleOnly && filter.ViewerUserID != nil {
			query = query.Where("(creator_id = ? OR visibility IN (?))", *filter.ViewerUserID, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))
		}
	}

	query = query.Where("deleted_at IS NULL").
		Where("status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()}))

	count, err := query.Count(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *BunGuidesRepository) UpdateDuration(ctx context.Context, id string, durationSeconds int) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.DurationSeconds = durationSeconds

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	err = r.db.NewSelect().
		Model(guide).
		WherePK().
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) BulkDelete(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	now := time.Now()
	query := r.db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("status = ?", models.StatusDeleted).
		Set("deleted_at = ?", now).
		Set("published_at = NULL").
		Set("archived_at = NULL").
		Set("restored_at = NULL").
		Set("updated_at = ?", now).
		Where("id IN (?)", bun.List(ids)).
		Where("team_id = ?", teamID).
		Where("deleted_at IS NULL").
		Where("(creator_id = ? OR (? AND visibility IN (?)))", actorID, isAdmin, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))

	res, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rowsAffected, nil
}

func (r *BunGuidesRepository) BulkRestore(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	now := time.Now()
	query := r.db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("status = ?", models.StatusDraft).
		Set("deleted_at = NULL").
		Set("restored_at = ?", now).
		Set("archived_at = NULL").
		Set("published_at = NULL").
		Set("updated_at = ?", now).
		Where("id IN (?)", bun.List(ids)).
		Where("team_id = ?", teamID).
		Where("deleted_at IS NOT NULL").
		Where("(creator_id = ? OR (? AND visibility IN (?)))", actorID, isAdmin, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))

	res, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rowsAffected, nil
}

func (r *BunGuidesRepository) BulkPermanentlyDelete(ctx context.Context, ids []uuid.UUID, teamID uuid.UUID, actorID string, isAdmin bool) (int64, error) {
	now := time.Now()
	query := r.db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("purge_requested_at = ?", now).
		Set("updated_at = ?", now).
		Where("id IN (?)", bun.List(ids)).
		Where("team_id = ?", teamID).
		Where("deleted_at IS NOT NULL").
		Where("(creator_id = ? OR (? AND visibility IN (?)))", actorID, isAdmin, bun.List([]string{string(models.VisibilityTeam), string(models.VisibilityPublic)}))

	res, err := query.Exec(ctx)
	if err != nil {
		return 0, err
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rowsAffected, nil
}

func (r *BunGuidesRepository) GetPendingPurge(ctx context.Context) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := r.db.NewSelect().
		Model((*models.Guide)(nil)).
		Column("id").
		Where("purge_requested_at IS NOT NULL OR deleted_at < NOW() - INTERVAL '30 days'").
		Order("deleted_at ASC").
		Limit(1000).
		Scan(ctx, &ids)
	return ids, err
}

func (r *BunGuidesRepository) HardDelete(ctx context.Context, id string) error {
	_, err := r.db.NewDelete().
		Model((*models.Guide)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	return err
}

func (r *BunGuidesRepository) Restore(ctx context.Context, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("deleted_at IS NOT NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusDraft
	now := time.Now()
	guide.RestoredAt = &now
	guide.PublishedAt = nil
	guide.ArchivedAt = nil
	guide.DeletedAt = nil

	_, err = r.db.NewUpdate().
		Model(guide).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return guide, nil
}
