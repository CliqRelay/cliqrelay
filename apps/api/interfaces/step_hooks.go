package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepHooks struct {
	BeforeCreate func(ctx context.Context, identity *models.Identity, req *types.CreateStepRequest) error
	AfterCreate  func(ctx context.Context, identity *models.Identity, step *models.Step) error
	BeforeUpdate func(ctx context.Context, identity *models.Identity, req *types.UpdateStepRequest) error
	AfterUpdate  func(ctx context.Context, identity *models.Identity, step *models.Step) error
	BeforeDelete func(ctx context.Context, identity *models.Identity, step *models.Step) error
	AfterDelete  func(ctx context.Context, identity *models.Identity, stepID string) error
}
