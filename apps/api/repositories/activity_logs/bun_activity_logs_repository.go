package activitylogs

import (
	"context"
	"database/sql"
	"errors"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
)

type BunActivityLogsRepository struct {
	db bun.IDB
}

func NewBunActivityLogsRepository(db bun.IDB) *BunActivityLogsRepository {
	return &BunActivityLogsRepository{db: db}
}

func (r *BunActivityLogsRepository) Insert(ctx context.Context, log *models.ActivityLog) (bool, error) {
	res, err := r.db.NewInsert().Model(log).On("CONFLICT (id) DO NOTHING").Exec(ctx)
	if err != nil {
		return false, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected > 0, nil
}

func (r *BunActivityLogsRepository) InsertOrMergeUpdate(ctx context.Context, log *models.ActivityLog, window time.Duration) (*models.ActivityLog, bool, error) {
	stored := log
	changed := false
	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Serialises concurrent workers so two updates cannot both miss the row and insert.
		if _, err := tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", log.TargetType+":"+log.TargetID+":"+log.ActorID); err != nil {
			return err
		}

		var existing models.ActivityLog
		err := tx.NewSelect().
			Model(&existing).
			Where("organization_id = ?", log.OrganizationID).
			Where("target_type = ?", log.TargetType).
			Where("target_id = ?", log.TargetID).
			Where("actor_id = ?", log.ActorID).
			Where("event_type = ?", models.ActivityGuideUpdated).
			Where("created_at > ?", log.CreatedAt.Add(-window)).
			Order("created_at DESC").
			Limit(1).
			Scan(ctx)
		if errors.Is(err, sql.ErrNoRows) {
			changed, err = NewBunActivityLogsRepository(tx).Insert(ctx, log)
			return err
		}
		if err != nil {
			return err
		}

		stored = &existing
		// An event older than the stored row arrived late; the row already covers it.
		if !log.CreatedAt.After(existing.CreatedAt) {
			return nil
		}

		existing.Metadata = log.Metadata
		existing.CreatedAt = log.CreatedAt
		if _, err := tx.NewUpdate().Model(&existing).Column("metadata", "created_at").WherePK().Exec(ctx); err != nil {
			return err
		}
		changed = true
		return nil
	})
	if err != nil {
		return nil, false, err
	}
	return stored, changed, nil
}

func (r *BunActivityLogsRepository) ListByTeam(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error) {
	logs := []*models.ActivityLog{}
	err := r.db.NewSelect().
		Model(&logs).
		Where("team_id = ?", teamID).
		WhereGroup(" AND ", func(q *bun.SelectQuery) *bun.SelectQuery {
			return q.Where("metadata->'guide'->>'visibility' IS DISTINCT FROM ?", models.VisibilityPrivate).
				WhereOr("metadata->'guide'->>'creator_id' = ?", viewerUserID)
		}).
		Order("created_at DESC").
		Limit(limit).
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return logs, nil
}

func (r *BunActivityLogsRepository) DeleteByTarget(ctx context.Context, targetType, targetID string) error {
	_, err := r.db.NewDelete().
		Model((*models.ActivityLog)(nil)).
		Where("target_type = ?", targetType).
		Where("target_id = ?", targetID).
		Exec(ctx)
	return err
}

func (r *BunActivityLogsRepository) SyncGuideVisibility(ctx context.Context, guideID string, visibility models.Visibility) error {
	_, err := r.db.NewUpdate().
		Model((*models.ActivityLog)(nil)).
		Set("metadata = jsonb_set(metadata, '{guide,visibility}', to_jsonb(?::text))", visibility).
		Where("target_type = ?", models.ActivityTargetGuide).
		Where("target_id = ?", guideID).
		Where("metadata->'guide' IS NOT NULL").
		Where("metadata->'guide'->>'visibility' IS DISTINCT FROM ?", visibility).
		Exec(ctx)
	return err
}

func (r *BunActivityLogsRepository) GetUserByID(ctx context.Context, userID string) (*authulamodels.User, error) {
	var user authulamodels.User
	err := r.db.NewSelect().Model(&user).Column("id", "name").Where("id = ?", userID).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *BunActivityLogsRepository) GetTeamOrganizationID(ctx context.Context, teamID uuid.UUID) (uuid.UUID, error) {
	var organizationID uuid.UUID
	err := r.db.NewSelect().
		TableExpr("organization_teams").
		Column("organization_id").
		Where("id = ?", teamID).
		Scan(ctx, &organizationID)
	if errors.Is(err, sql.ErrNoRows) {
		return uuid.Nil, nil
	}
	if err != nil {
		return uuid.Nil, err
	}
	return organizationID, nil
}
