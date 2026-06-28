package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetHooks struct {
	BeforeCreate func(ctx context.Context, actor *authulamodels.Actor, req *types.CreateMediaAssetRequest) error
	AfterCreate  func(ctx context.Context, actor *authulamodels.Actor, asset *models.MediaAsset) error
	BeforeUpdate func(ctx context.Context, actor *authulamodels.Actor, req *types.UpdateMediaAssetRequest) error
	AfterUpdate  func(ctx context.Context, actor *authulamodels.Actor, asset *models.MediaAsset) error
	BeforeDelete func(ctx context.Context, actor *authulamodels.Actor, assetID string) error
	AfterDelete  func(ctx context.Context, actor *authulamodels.Actor, assetID string) error
}
