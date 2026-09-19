package media_assets

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type BunMediaAssetsRepository struct {
	db bun.IDB
}

func NewBunMediaAssetsRepository(db bun.IDB) *BunMediaAssetsRepository {
	return &BunMediaAssetsRepository{db: db}
}

func (r *BunMediaAssetsRepository) Tx(ctx context.Context, fn func(ctx context.Context, repo interfaces.MediaAssetsRepository) error) error {
	return r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		return fn(ctx, &BunMediaAssetsRepository{db: tx})
	})
}

func (r *BunMediaAssetsRepository) Create(ctx context.Context, dto *types.CreateMediaAssetDTO) (*models.MediaAsset, error) {
	mediaAsset := &models.MediaAsset{
		ID:          uuid.New(),
		StepID:      dto.StepID,
		StoragePath: dto.StoragePath,
		MimeType:    dto.MimeType,
		AltText:     dto.AltText,
		Thumbnail:   dto.Thumbnail,
		Height:      dto.Height,
		Width:       dto.Width,
		ByteSize:    dto.ByteSize,
	}

	_, err := r.db.NewInsert().
		Model(mediaAsset).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAsset, nil
}

func (r *BunMediaAssetsRepository) GetByID(ctx context.Context, id string) (*models.MediaAsset, error) {
	mediaAsset := &models.MediaAsset{}

	err := r.db.NewSelect().
		Model(mediaAsset).
		Where("id = ?", id).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return mediaAsset, nil
}

func (r *BunMediaAssetsRepository) GetByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error) {
	var mediaAssets = make([]*models.MediaAsset, 0)

	err := r.db.NewSelect().
		Model(&mediaAssets).
		Where("step_id = ?", stepID).
		Order("created_at DESC", "id DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

func (r *BunMediaAssetsRepository) ExistingStoragePaths(ctx context.Context, paths []string) ([]string, error) {
	existing := make([]string, 0)
	if len(paths) == 0 {
		return existing, nil
	}

	err := r.db.NewSelect().
		Model((*models.MediaAsset)(nil)).
		Column("storage_path").
		Where("storage_path IN (?)", bun.List(paths)).
		Scan(ctx, &existing)
	if err != nil {
		return nil, err
	}

	return existing, nil
}

func (r *BunMediaAssetsRepository) Update(ctx context.Context, dto *types.UpdateMediaAssetDTO) (*models.MediaAsset, error) {
	mediaAsset := &models.MediaAsset{}

	query := r.db.NewUpdate().
		Model(mediaAsset).
		Where("id = ?", dto.ID).
		Returning("*")

	hasChanges := false
	set := func(column string, value any) {
		hasChanges = true
		query.Set("? = ?", bun.Ident(column), value)
	}
	if dto.AltText != nil {
		set("alt_text", *dto.AltText)
	}
	if dto.Thumbnail != nil {
		set("thumbnail", *dto.Thumbnail)
	}
	if dto.MimeType != nil {
		set("mime_type", *dto.MimeType)
	}
	if dto.Height != nil {
		set("height", *dto.Height)
	}
	if dto.Width != nil {
		set("width", *dto.Width)
	}
	if dto.ByteSize != nil {
		set("byte_size", *dto.ByteSize)
	}

	if !hasChanges {
		return r.GetByID(ctx, dto.ID.String())
	}

	return execReturningOne(ctx, query, mediaAsset)
}

func (r *BunMediaAssetsRepository) Delete(ctx context.Context, id string) (*models.MediaAsset, error) {
	mediaAsset := &models.MediaAsset{}

	query := r.db.NewDelete().
		Model(mediaAsset).
		Where("id = ?", id).
		Returning("*")

	return execReturningOne(ctx, query, mediaAsset)
}

func (r *BunMediaAssetsRepository) DeleteByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error) {
	var mediaAssets = make([]*models.MediaAsset, 0)

	_, err := r.db.NewDelete().
		Model(&mediaAssets).
		Where("step_id = ?", stepID).
		Returning("*").
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

type execer interface {
	Exec(ctx context.Context, dest ...any) (sql.Result, error)
}

// Runs a single-row RETURNING * statement; bun leaves the model zeroed rather than
// returning sql.ErrNoRows when nothing matched, so the row count decides not-found.
func execReturningOne(ctx context.Context, query execer, mediaAsset *models.MediaAsset) (*models.MediaAsset, error) {
	res, err := query.Exec(ctx)
	if err != nil {
		return nil, err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, nil
	}

	return mediaAsset, nil
}
