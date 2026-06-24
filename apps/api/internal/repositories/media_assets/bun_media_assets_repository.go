package media_assets

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type BunMediaAssetsRepository struct {
	db bun.IDB
}

func NewBunMediaAssetsRepository(db bun.IDB) *BunMediaAssetsRepository {
	return &BunMediaAssetsRepository{db: db}
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

	err := r.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		_, err := tx.NewInsert().Model(mediaAsset).Exec(ctx)
		if err != nil {
			return err
		}

		err = tx.NewSelect().Model(mediaAsset).WherePK().Scan(ctx)
		return err
	})

	return mediaAsset, err
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
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAssets, nil
}

func (r *BunMediaAssetsRepository) Update(ctx context.Context, dto *types.UpdateMediaAssetDTO) (*models.MediaAsset, error) {
	mediaAsset := &models.MediaAsset{}

	err := r.db.NewSelect().
		Model(mediaAsset).
		Where("id = ?", dto.ID).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if dto.AltText != nil {
		mediaAsset.AltText = dto.AltText
	}
	if dto.Thumbnail != nil {
		mediaAsset.Thumbnail = dto.Thumbnail
	}
	if dto.MimeType != nil {
		mediaAsset.MimeType = dto.MimeType
	}
	if dto.Height != nil {
		mediaAsset.Height = dto.Height
	}
	if dto.Width != nil {
		mediaAsset.Width = dto.Width
	}
	if dto.ByteSize != nil {
		mediaAsset.ByteSize = dto.ByteSize
	}

	_, err = r.db.NewUpdate().
		Model(mediaAsset).
		WherePK().
		Column("alt_text", "thumbnail", "mime_type", "height", "width", "byte_size").
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	err = r.db.NewSelect().
		Model(mediaAsset).
		WherePK().
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAsset, nil
}

func (r *BunMediaAssetsRepository) Delete(ctx context.Context, id string) (*models.MediaAsset, error) {
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

	_, err = r.db.NewDelete().
		Model(mediaAsset).
		WherePK().
		Exec(ctx)
	if err != nil {
		return nil, err
	}

	return mediaAsset, nil
}
