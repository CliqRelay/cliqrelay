package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepHooks struct {
	BeforeCreate func(ctx context.Context, userID string, req *types.CreateStepRequest) error
	AfterCreate  func(ctx context.Context, userID string, step *models.Step) error
	BeforeUpdate func(ctx context.Context, userID string, req *types.UpdateStepRequest) error
	AfterUpdate  func(ctx context.Context, userID string, step *models.Step) error
	BeforeDelete func(ctx context.Context, userID string, step *models.Step) error
	AfterDelete  func(ctx context.Context, userID string, stepID string) error
}
