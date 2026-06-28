package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsService interface {
	Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error)
	GetByID(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error)
	GetByStepID(ctx context.Context, actor *authulamodels.Actor, stepID string) ([]*models.MediaAsset, error)
	Update(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error)
}
