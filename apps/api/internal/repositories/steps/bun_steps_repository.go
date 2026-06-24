package steps

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"roci.dev/fracdex"

	"github.com/CliqRelay/cliqrelay/internal/constants"
	"github.com/CliqRelay/cliqrelay/internal/interfaces"
	"github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type BunStepsRepository struct {
	db bun.IDB
}

func NewBunStepsRepository(db bun.IDB) *BunStepsRepository {
	return &BunStepsRepository{db: db}
}

func (r *BunStepsRepository) Tx(ctx context.Context, fn func(ctx context.Context, repo interfaces.StepsRepository) error) error {
	return r.db.(*bun.DB).RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		return fn(ctx, &BunStepsRepository{db: tx})
	})
}

func (r *BunStepsRepository) Create(ctx context.Context, dto *types.CreateStepDTO) (*models.Step, error) {
	step := &models.Step{
		ID:            uuid.New(),
		GuideID:       dto.GuideID,
		Type:          dto.Type,
		Action:        dto.Action,
		ActionText:    dto.ActionText,
		URL:           dto.URL,
		Notes:         dto.Notes,
		TargetElement: dto.TargetElement,
		CanvasContent: dto.CanvasContent,
	}

	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		var sortOrder string

		switch {
		case dto.InsertBeforeStepID != nil:
			var currentSort string
			err := tx.NewSelect().
				Model((*models.Step)(nil)).
				Column("sort_order").
				Where("guide_id = ?", dto.GuideID).
				Where("id = ?", *dto.InsertBeforeStepID).
				For("UPDATE").
				Scan(ctx, &currentSort)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return constants.ErrStepNotFound
				}
				return fmt.Errorf("get anchor sort_order: %w", err)
			}

			var prevSort string
			err = tx.NewSelect().
				Model((*models.Step)(nil)).
				Column("sort_order").
				Where("guide_id = ?", dto.GuideID).
				Where("sort_order < ?", currentSort).
				Order("sort_order DESC").
				Limit(1).
				For("UPDATE").
				Scan(ctx, &prevSort)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					key, err := fracdex.KeyBetween("", currentSort)
					if err != nil {
						return fmt.Errorf("generate key before first step: %w", err)
					}
					sortOrder = key
				} else {
					return fmt.Errorf("get previous sort_order: %w", err)
				}
			} else {
				key, err := fracdex.KeyBetween(prevSort, currentSort)
				if err != nil {
					return fmt.Errorf("generate key between %q and %q: %w", prevSort, currentSort, err)
				}
				sortOrder = key
			}

		case dto.InsertAfterStepID != nil:
			var currentSort string
			err := tx.NewSelect().
				Model((*models.Step)(nil)).
				Column("sort_order").
				Where("guide_id = ?", dto.GuideID).
				Where("id = ?", *dto.InsertAfterStepID).
				For("UPDATE").
				Scan(ctx, &currentSort)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return constants.ErrStepNotFound
				}
				return fmt.Errorf("get anchor sort_order: %w", err)
			}

			var nextSort string
			err = tx.NewSelect().
				Model((*models.Step)(nil)).
				Column("sort_order").
				Where("guide_id = ?", dto.GuideID).
				Where("sort_order > ?", currentSort).
				Order("sort_order ASC").
				Limit(1).
				For("UPDATE").
				Scan(ctx, &nextSort)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					key, err := fracdex.KeyBetween(currentSort, "")
					if err != nil {
						return fmt.Errorf("generate key after last step: %w", err)
					}
					sortOrder = key
				} else {
					return fmt.Errorf("get next sort_order: %w", err)
				}
			} else {
				key, err := fracdex.KeyBetween(currentSort, nextSort)
				if err != nil {
					return fmt.Errorf("generate key between %q and %q: %w", currentSort, nextSort, err)
				}
				sortOrder = key
			}

		default:
			var lastSort string
			err := tx.NewSelect().
				Model((*models.Step)(nil)).
				Column("sort_order").
				Where("guide_id = ?", dto.GuideID).
				Order("sort_order DESC").
				Limit(1).
				For("UPDATE").
				Scan(ctx, &lastSort)
			if err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					key, err := fracdex.KeyBetween("", "")
					if err != nil {
						return fmt.Errorf("generate first key: %w", err)
					}
					sortOrder = key
				} else {
					return fmt.Errorf("get last sort_order: %w", err)
				}
			} else {
				key, err := fracdex.KeyBetween(lastSort, "")
				if err != nil {
					return fmt.Errorf("generate key after %q: %w", lastSort, err)
				}
				sortOrder = key
			}
		}

		step.SortOrder = sortOrder

		_, err := tx.NewInsert().Model(step).Returning("*").Exec(ctx)
		return err
	})

	return step, err
}

func (r *BunStepsRepository) GetByID(ctx context.Context, id string) (*models.Step, error) {
	step := &models.Step{}

	err := r.db.NewSelect().
		Model(step).
		Relation("MediaAssets").
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return step, nil
}

func (r *BunStepsRepository) GetByGuideID(ctx context.Context, guideID string) ([]*models.Step, error) {
	var steps = make([]*models.Step, 0)

	err := r.db.NewSelect().
		Model(&steps).
		Relation("MediaAssets").
		Where("guide_id = ?", guideID).
		Order("sort_order ASC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return steps, nil
}

func (r *BunStepsRepository) Update(ctx context.Context, dto *types.UpdateStepDTO) (*models.Step, error) {
	step := &models.Step{}

	query := r.db.NewUpdate().
		Model(step).
		Where("id = ?", dto.ID).
		Returning("*")

	hasUpdates := false

	if dto.Type != nil {
		query.Set("type = ?", *dto.Type)
		hasUpdates = true

		switch *dto.Type {
		case models.StepTypeInteraction:
			query.Set("canvas_content = NULL")
		case models.StepTypeCanvas:
			query.Set("action = NULL").
				Set("action_text = NULL").
				Set("url = NULL").
				Set("target_element = NULL")
		}
	}

	if dto.Notes != nil {
		query.Set("notes = ?", dto.Notes)
		hasUpdates = true
	}

	if dto.Action != nil {
		query.Set("action = ?", dto.Action)
		hasUpdates = true
	}
	if dto.ActionText != nil {
		query.Set("action_text = ?", dto.ActionText)
		hasUpdates = true
	}
	if dto.URL != nil {
		query.Set("url = ?", dto.URL)
		hasUpdates = true
	}
	if dto.TargetElement != nil {
		query.Set("target_element = ?", dto.TargetElement)
		hasUpdates = true
	}
	if dto.CanvasContent != nil {
		query.Set("canvas_content = ?", dto.CanvasContent)
		hasUpdates = true
	}

	if !hasUpdates {
		err := r.db.NewSelect().
			Model(step).
			Relation("MediaAssets").
			Where("id = ?", dto.ID).
			Scan(ctx)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, nil
			}
			return nil, err
		}
		return step, nil
	}

	query.Set("updated_at = ?", time.Now())

	res, err := query.Exec(ctx)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rowsAffected == 0 {
		return nil, nil
	}

	err = r.db.NewSelect().
		Model(step).
		Relation("MediaAssets").
		WherePK().
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return step, nil
}

func (r *BunStepsRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.NewDelete().
		Model((*models.Step)(nil)).
		Where("id = ?", id).
		Exec(ctx)
	if err != nil {
		return err
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		// Log a warning or handle the fact that the ID didn't exist, if desired
	}

	return nil
}

func (r *BunStepsRepository) Reorder(ctx context.Context, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error) {
	steps := make([]*models.Step, 0)

	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := r.reorderInTx(ctx, tx, guideID, targetStepID, prevStepID, nextStepID)
		if err != nil {
			// Sort keys may be corrupted. Re-key all steps and retry.
			if err := r.rekeyGuideSteps(ctx, tx, guideID); err != nil {
				return fmt.Errorf("rekeying guide steps: %w", err)
			}
			_, err = r.reorderInTx(ctx, tx, guideID, targetStepID, prevStepID, nextStepID)
			if err != nil {
				return fmt.Errorf("reorder after rekey: %w", err)
			}
		}

		err = tx.NewSelect().
			Model(&steps).
			Where("guide_id = ?", guideID).
			Order("sort_order ASC").
			Scan(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}

	return steps, nil
}

func (r *BunStepsRepository) reorderInTx(ctx context.Context, tx bun.Tx, guideID string, targetStepID string, prevStepID *string, nextStepID *string) (string, error) {
	var prevSort, nextSort string

	if prevStepID != nil && *prevStepID != "" {
		err := tx.NewSelect().
			Model((*models.Step)(nil)).
			Column("sort_order").
			Where("id = ?", *prevStepID).
			Where("guide_id = ?", guideID).
			For("UPDATE").
			Scan(ctx, &prevSort)
		if err != nil {
			return "", fmt.Errorf("get prev step sort_order: %w", err)
		}
	}

	if nextStepID != nil && *nextStepID != "" {
		err := tx.NewSelect().
			Model((*models.Step)(nil)).
			Column("sort_order").
			Where("id = ?", *nextStepID).
			Where("guide_id = ?", guideID).
			For("UPDATE").
			Scan(ctx, &nextSort)
		if err != nil {
			return "", fmt.Errorf("get next step sort_order: %w", err)
		}
	}

	key, err := fracdex.KeyBetween(prevSort, nextSort)
	if err != nil {
		return "", fmt.Errorf("generate key between %q and %q: %w", prevSort, nextSort, err)
	}

	_, err = tx.NewUpdate().
		Model((*models.Step)(nil)).
		Set("sort_order = ?", key).
		Where("id = ?", targetStepID).
		Where("guide_id = ?", guideID).
		Exec(ctx)
	if err != nil {
		return "", err
	}

	return key, nil
}

func (r *BunStepsRepository) rekeyGuideSteps(ctx context.Context, tx bun.Tx, guideID string) error {
	var guideSteps []*models.Step
	err := tx.NewSelect().
		Model(&guideSteps).
		Where("guide_id = ?", guideID).
		Order("sort_order ASC").
		Scan(ctx)
	if err != nil {
		return err
	}

	keys, err := fracdex.NKeysBetween("", "", uint(len(guideSteps)))
	if err != nil {
		return err
	}

	var buf strings.Builder
	buf.WriteString("UPDATE steps SET sort_order = CASE id")
	args := make([]any, 0, len(guideSteps)*2+1)
	for i, step := range guideSteps {
		buf.WriteString(" WHEN ? THEN ?")
		args = append(args, step.ID, keys[i])
	}
	buf.WriteString(" END WHERE guide_id = ?")
	args = append(args, guideID)

	_, err = tx.ExecContext(ctx, buf.String(), args...)
	return err
}
