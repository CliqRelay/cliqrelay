package guideexports

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
)

type BunGuideExportsRepository struct {
	db bun.IDB
}

func NewBunGuideExportsRepository(db bun.IDB) *BunGuideExportsRepository {
	return &BunGuideExportsRepository{db: db}
}

func (r *BunGuideExportsRepository) Create(ctx context.Context, workspaceID string, guideID uuid.UUID, userID string, format models.ExportGuideFormat) (*models.GuideExport, error) {
	export := &models.GuideExport{
		ID:          uuid.New(),
		WorkspaceID: uuid.MustParse(workspaceID),
		GuideID:     guideID,
		UserID:      userID,
		Format:      format,
		Status:      models.ExportStatusPending,
	}

	_, err := r.db.NewInsert().
		Model(export).
		Returning("*").
		Exec(ctx)

	if err != nil {
		return nil, err
	}

	return export, nil
}

func (r *BunGuideExportsRepository) GetByID(ctx context.Context, workspaceID string, id uuid.UUID, userID string) (*models.GuideExport, error) {
	export := &models.GuideExport{}

	err := r.db.NewSelect().
		Model(export).
		Where("id = ?", id).
		Where("workspace_id = ?", workspaceID).
		Where("user_id = ?", userID).
		Scan(ctx)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return export, nil
}

func (r *BunGuideExportsRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status models.ExportStatus, storagePath string, errMsg string) error {
	export := &models.GuideExport{
		ID:           id,
		Status:       status,
		StoragePath:  &storagePath,
		ErrorMessage: &errMsg,
	}

	_, err := r.db.NewUpdate().
		Model(export).
		Column("status", "storage_path", "error_message").
		WherePK().
		Exec(ctx)

	return err
}
