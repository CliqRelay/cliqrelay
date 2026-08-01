package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepHook func(ctx context.Context, step *models.Step) error

type CreateStepHook func(ctx context.Context, req *types.CreateStepRequest) error

type UpdateStepHook func(ctx context.Context, req *types.UpdateStepRequest) error

type DeleteStepHook func(ctx context.Context, stepID string) error

type StepHooks struct {
	beforeCreate []CreateStepHook
	afterCreate  []StepHook
	beforeUpdate []UpdateStepHook
	afterUpdate  []StepHook
	beforeDelete []StepHook
	afterDelete  []DeleteStepHook
}

func (h *StepHooks) RegisterBeforeCreate(fn CreateStepHook) {
	h.beforeCreate = append(h.beforeCreate, fn)
}

func (h *StepHooks) RegisterAfterCreate(fn StepHook) {
	h.afterCreate = append(h.afterCreate, fn)
}

func (h *StepHooks) RegisterBeforeUpdate(fn UpdateStepHook) {
	h.beforeUpdate = append(h.beforeUpdate, fn)
}

func (h *StepHooks) RegisterAfterUpdate(fn StepHook) {
	h.afterUpdate = append(h.afterUpdate, fn)
}

func (h *StepHooks) RegisterBeforeDelete(fn StepHook) {
	h.beforeDelete = append(h.beforeDelete, fn)
}

func (h *StepHooks) RegisterAfterDelete(fn DeleteStepHook) {
	h.afterDelete = append(h.afterDelete, fn)
}

func (h *StepHooks) BeforeCreateHooks() []CreateStepHook {
	if h == nil {
		return nil
	}
	return h.beforeCreate
}

func (h *StepHooks) AfterCreateHooks() []StepHook {
	if h == nil {
		return nil
	}
	return h.afterCreate
}

func (h *StepHooks) BeforeUpdateHooks() []UpdateStepHook {
	if h == nil {
		return nil
	}
	return h.beforeUpdate
}

func (h *StepHooks) AfterUpdateHooks() []StepHook {
	if h == nil {
		return nil
	}
	return h.afterUpdate
}

func (h *StepHooks) BeforeDeleteHooks() []StepHook {
	if h == nil {
		return nil
	}
	return h.beforeDelete
}

func (h *StepHooks) AfterDeleteHooks() []DeleteStepHook {
	if h == nil {
		return nil
	}
	return h.afterDelete
}
