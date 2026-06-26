package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetHooks struct {
	BeforeCreate func(ctx context.Context, userID string, req *types.CreateMediaAssetRequest) error
	AfterCreate  func(ctx context.Context, userID string, asset *models.MediaAsset) error
	BeforeUpdate func(ctx context.Context, userID string, req *types.UpdateMediaAssetRequest) error
	AfterUpdate  func(ctx context.Context, userID string, asset *models.MediaAsset) error
	BeforeDelete func(ctx context.Context, userID string, assetID string) error
	AfterDelete  func(ctx context.Context, userID string, assetID string) error
}
