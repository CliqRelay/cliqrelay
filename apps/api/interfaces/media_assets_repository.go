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
}
