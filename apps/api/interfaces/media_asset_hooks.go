package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type MediaAssetHooks struct {
	BeforeCreate []func(ctx context.Context, asset *models.MediaAsset, userID string) error
	AfterCreate  []func(ctx context.Context, asset *models.MediaAsset, userID string) error
	BeforeDelete []func(ctx context.Context, assetID string, userID string) error
	AfterDelete  []func(ctx context.Context, assetID string, userID string) error
}
