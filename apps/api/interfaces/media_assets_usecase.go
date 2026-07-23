package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsUseCase interface {
	Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error)
	ListByStep(ctx context.Context, actor *authulamodels.Actor, stepID string) ([]*models.MediaAsset, error)
	Get(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error)
	Update(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error)
}
