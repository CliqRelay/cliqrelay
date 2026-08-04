package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetHook func(ctx context.Context, asset *models.MediaAsset) error

type CreateMediaAssetHook func(ctx context.Context, req *types.CreateMediaAssetRequest) error

type UpdateMediaAssetHook func(ctx context.Context, req *types.UpdateMediaAssetRequest) error

type DeleteMediaAssetHook func(ctx context.Context, assetID string) error

type MediaAssetHooks struct {
	beforeCreate []CreateMediaAssetHook
	afterCreate  []MediaAssetHook
	beforeUpdate []UpdateMediaAssetHook
	afterUpdate  []MediaAssetHook
	beforeDelete []DeleteMediaAssetHook
	afterDelete  []DeleteMediaAssetHook
}

func (h *MediaAssetHooks) RegisterBeforeCreate(fn CreateMediaAssetHook) {
	h.beforeCreate = append(h.beforeCreate, fn)
}

func (h *MediaAssetHooks) RegisterAfterCreate(fn MediaAssetHook) {
	h.afterCreate = append(h.afterCreate, fn)
}

func (h *MediaAssetHooks) RegisterBeforeUpdate(fn UpdateMediaAssetHook) {
	h.beforeUpdate = append(h.beforeUpdate, fn)
}

func (h *MediaAssetHooks) RegisterAfterUpdate(fn MediaAssetHook) {
	h.afterUpdate = append(h.afterUpdate, fn)
}

func (h *MediaAssetHooks) RegisterBeforeDelete(fn DeleteMediaAssetHook) {
	h.beforeDelete = append(h.beforeDelete, fn)
}

func (h *MediaAssetHooks) RegisterAfterDelete(fn DeleteMediaAssetHook) {
	h.afterDelete = append(h.afterDelete, fn)
}

func (h *MediaAssetHooks) BeforeCreateHooks() []CreateMediaAssetHook { return h.beforeCreate }
func (h *MediaAssetHooks) AfterCreateHooks() []MediaAssetHook        { return h.afterCreate }
func (h *MediaAssetHooks) BeforeUpdateHooks() []UpdateMediaAssetHook { return h.beforeUpdate }
func (h *MediaAssetHooks) AfterUpdateHooks() []MediaAssetHook        { return h.afterUpdate }
func (h *MediaAssetHooks) BeforeDeleteHooks() []DeleteMediaAssetHook { return h.beforeDelete }
func (h *MediaAssetHooks) AfterDeleteHooks() []DeleteMediaAssetHook  { return h.afterDelete }
