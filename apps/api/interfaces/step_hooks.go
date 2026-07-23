package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepHooks struct {
	BeforeCreate func(ctx context.Context, req *types.CreateStepRequest) error
	AfterCreate  func(ctx context.Context, step *models.Step) error
	BeforeUpdate func(ctx context.Context, req *types.UpdateStepRequest) error
	AfterUpdate  func(ctx context.Context, step *models.Step) error
	BeforeDelete func(ctx context.Context, step *models.Step) error
	AfterDelete  func(ctx context.Context, stepID string) error
}
