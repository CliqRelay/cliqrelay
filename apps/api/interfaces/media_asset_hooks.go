package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetHooks struct {
	BeforeCreate func(ctx context.Context, identity *models.Identity, req *types.CreateMediaAssetRequest) error
	AfterCreate  func(ctx context.Context, identity *models.Identity, asset *models.MediaAsset) error
	BeforeUpdate func(ctx context.Context, identity *models.Identity, req *types.UpdateMediaAssetRequest) error
	AfterUpdate  func(ctx context.Context, identity *models.Identity, asset *models.MediaAsset) error
	BeforeDelete func(ctx context.Context, identity *models.Identity, assetID string) error
	AfterDelete  func(ctx context.Context, identity *models.Identity, assetID string) error
}
