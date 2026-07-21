package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsService interface {
	Create(ctx context.Context, workspaceID string, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error)
	GetByID(ctx context.Context, mediaAssetID string) (*models.MediaAsset, error)
	GetByStepID(ctx context.Context, stepID string) ([]*models.MediaAsset, error)
	Update(ctx context.Context, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error)
	Delete(ctx context.Context, mediaAssetID string) (*models.MediaAsset, error)
}
