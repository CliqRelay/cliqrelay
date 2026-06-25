package guides

import (
	"context"
	"database/sql"
	"errors"
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

func (r *BunGuidesRepository) Create(ctx context.Context, userID string, dto *types.CreateGuideDTO) (*models.Guide, error) {
	guide := &models.Guide{
		ID:          uuid.New(),
		CreatorID:   userID,
		Title:       dto.Title,
		Description: dto.Description,
		Status:      models.StatusDraft,
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

func (r *BunGuidesRepository) GetAll(ctx context.Context, userID string) ([]*models.Guide, error) {
	guides := make([]*models.Guide, 0)

	err := r.db.NewSelect().
		Model(&guides).
		Where("creator_id = ?", userID).
		Where("deleted_at IS NULL").
		Where("status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString()})).
		Order("updated_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return guides, nil
}

func (r *BunGuidesRepository) GetAllByStatus(ctx context.Context, userID string, status models.GuideStatus) ([]*models.Guide, error) {
	guides := make([]*models.Guide, 0)

	query := r.db.NewSelect().
		Model(&guides).
		Where("creator_id = ?", userID)

	if status == models.StatusDeleted {
		cutoff := time.Now().AddDate(0, 0, -30)
		query = query.Where("deleted_at >= ?", cutoff).Where("status = ?", models.StatusDeleted)
	} else {
		query = query.Where("status = ?", status).Where("deleted_at IS NULL")
	}

	err := query.Order("updated_at DESC").Scan(ctx)
	if err != nil {
		return nil, err
	}

	return guides, nil
}

func (r *BunGuidesRepository) GetByID(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return guide, nil
}

func (r *BunGuidesRepository) GetByIDAnyUser(ctx context.Context, id string) (*models.Guide, error) {
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

	return guide, nil
}

func (r *BunGuidesRepository) Update(ctx context.Context, userID string, data *types.UpdateGuideDTO) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", data.ID).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) Delete(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}
	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) Publish(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
		Where("deleted_at IS NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.Status = models.StatusPublished
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

func (r *BunGuidesRepository) Unpublish(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) Archive(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) Unarchive(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) PermanentlyDelete(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}
	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
		Where("deleted_at IS NOT NULL").
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	guide.PublishedAt = nil
	guide.ArchivedAt = nil
	guide.RestoredAt = nil
	guide.Status = models.StatusPendingPurge
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

func (r *BunGuidesRepository) GetCount(ctx context.Context, userID string) (int, error) {
	count, err := r.db.NewSelect().
		Model((*models.Guide)(nil)).
		Where("creator_id = ?", userID).
		Where("deleted_at IS NULL").
		Where("status IN (?)", bun.List([]string{models.StatusDraft.ToString(), models.StatusPublished.ToString(), models.StatusArchived.ToString()})).
		Count(ctx)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (r *BunGuidesRepository) UpdateDuration(ctx context.Context, userID string, id string, durationSeconds int) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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

func (r *BunGuidesRepository) Restore(ctx context.Context, userID string, id string) (*models.Guide, error) {
	guide := &models.Guide{}

	err := r.db.NewSelect().
		Model(guide).
		Where("id = ?", id).
		Where("creator_id = ?", userID).
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
