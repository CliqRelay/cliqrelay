package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuideHook func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error

type CreateGuideHook func(ctx context.Context, actor *authulamodels.Actor, teamID string, req *types.CreateGuideRequest) error

type DeleteGuideHook func(ctx context.Context, actor *authulamodels.Actor, guideID string) error

type BulkRestoreGuideHook func(ctx context.Context, actor *authulamodels.Actor, teamID string, guideIDs []string) error

type GuideHooks struct {
	beforeCreate      []CreateGuideHook
	afterCreate       []GuideHook
	beforeUpdate      []GuideHook
	afterUpdate       []GuideHook
	beforeDelete      []DeleteGuideHook
	afterDelete       []DeleteGuideHook
	beforePublish     []GuideHook
	afterPublish      []GuideHook
	beforeArchive     []GuideHook
	afterArchive      []GuideHook
	beforeUnarchive   []GuideHook
	afterUnarchive    []GuideHook
	beforeUnpublish   []GuideHook
	afterUnpublish    []GuideHook
	beforeRestore     []GuideHook
	afterRestore      []GuideHook
	beforeBulkRestore []BulkRestoreGuideHook
	afterBulkRestore  []BulkRestoreGuideHook
}

func (h *GuideHooks) RegisterBeforeCreate(fn CreateGuideHook) {
	h.beforeCreate = append(h.beforeCreate, fn)
}

func (h *GuideHooks) RegisterAfterCreate(fn GuideHook) {
	h.afterCreate = append(h.afterCreate, fn)
}

func (h *GuideHooks) RegisterBeforeUpdate(fn GuideHook) {
	h.beforeUpdate = append(h.beforeUpdate, fn)
}

func (h *GuideHooks) RegisterAfterUpdate(fn GuideHook) {
	h.afterUpdate = append(h.afterUpdate, fn)
}

func (h *GuideHooks) RegisterBeforeDelete(fn DeleteGuideHook) {
	h.beforeDelete = append(h.beforeDelete, fn)
}

func (h *GuideHooks) RegisterAfterDelete(fn DeleteGuideHook) {
	h.afterDelete = append(h.afterDelete, fn)
}

func (h *GuideHooks) RegisterBeforePublish(fn GuideHook) {
	h.beforePublish = append(h.beforePublish, fn)
}

func (h *GuideHooks) RegisterAfterPublish(fn GuideHook) {
	h.afterPublish = append(h.afterPublish, fn)
}

func (h *GuideHooks) RegisterBeforeArchive(fn GuideHook) {
	h.beforeArchive = append(h.beforeArchive, fn)
}

func (h *GuideHooks) RegisterAfterArchive(fn GuideHook) {
	h.afterArchive = append(h.afterArchive, fn)
}

func (h *GuideHooks) RegisterBeforeUnarchive(fn GuideHook) {
	h.beforeUnarchive = append(h.beforeUnarchive, fn)
}

func (h *GuideHooks) RegisterAfterUnarchive(fn GuideHook) {
	h.afterUnarchive = append(h.afterUnarchive, fn)
}

func (h *GuideHooks) RegisterBeforeUnpublish(fn GuideHook) {
	h.beforeUnpublish = append(h.beforeUnpublish, fn)
}

func (h *GuideHooks) RegisterAfterUnpublish(fn GuideHook) {
	h.afterUnpublish = append(h.afterUnpublish, fn)
}

func (h *GuideHooks) RegisterBeforeRestore(fn GuideHook) {
	h.beforeRestore = append(h.beforeRestore, fn)
}

func (h *GuideHooks) RegisterAfterRestore(fn GuideHook) {
	h.afterRestore = append(h.afterRestore, fn)
}

func (h *GuideHooks) RegisterBeforeBulkRestore(fn BulkRestoreGuideHook) {
	h.beforeBulkRestore = append(h.beforeBulkRestore, fn)
}

func (h *GuideHooks) RegisterAfterBulkRestore(fn BulkRestoreGuideHook) {
	h.afterBulkRestore = append(h.afterBulkRestore, fn)
}

func (h *GuideHooks) BeforeCreateHooks() []CreateGuideHook           { return h.beforeCreate }
func (h *GuideHooks) AfterCreateHooks() []GuideHook                  { return h.afterCreate }
func (h *GuideHooks) BeforeUpdateHooks() []GuideHook                 { return h.beforeUpdate }
func (h *GuideHooks) AfterUpdateHooks() []GuideHook                  { return h.afterUpdate }
func (h *GuideHooks) BeforeDeleteHooks() []DeleteGuideHook           { return h.beforeDelete }
func (h *GuideHooks) AfterDeleteHooks() []DeleteGuideHook            { return h.afterDelete }
func (h *GuideHooks) BeforePublishHooks() []GuideHook                { return h.beforePublish }
func (h *GuideHooks) AfterPublishHooks() []GuideHook                 { return h.afterPublish }
func (h *GuideHooks) BeforeArchiveHooks() []GuideHook                { return h.beforeArchive }
func (h *GuideHooks) AfterArchiveHooks() []GuideHook                 { return h.afterArchive }
func (h *GuideHooks) BeforeUnarchiveHooks() []GuideHook              { return h.beforeUnarchive }
func (h *GuideHooks) AfterUnarchiveHooks() []GuideHook               { return h.afterUnarchive }
func (h *GuideHooks) BeforeUnpublishHooks() []GuideHook              { return h.beforeUnpublish }
func (h *GuideHooks) AfterUnpublishHooks() []GuideHook               { return h.afterUnpublish }
func (h *GuideHooks) BeforeRestoreHooks() []GuideHook                { return h.beforeRestore }
func (h *GuideHooks) AfterRestoreHooks() []GuideHook                 { return h.afterRestore }
func (h *GuideHooks) BeforeBulkRestoreHooks() []BulkRestoreGuideHook { return h.beforeBulkRestore }
func (h *GuideHooks) AfterBulkRestoreHooks() []BulkRestoreGuideHook  { return h.afterBulkRestore }
