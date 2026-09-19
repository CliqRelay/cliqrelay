package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsRepository interface {
	Create(ctx context.Context, dto *types.CreateMediaAssetDTO) (*models.MediaAsset, error)
	GetByID(ctx context.Context, id string) (*models.MediaAsset, error)
	GetByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error)
	Update(ctx context.Context, dto *types.UpdateMediaAssetDTO) (*models.MediaAsset, error)
	Delete(ctx context.Context, id string) (*models.MediaAsset, error)
	ExistingStoragePaths(ctx context.Context, paths []string) ([]string, error)
	DeleteByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error)
	Tx(ctx context.Context, fn func(ctx context.Context, repo MediaAssetsRepository) error) error
}
