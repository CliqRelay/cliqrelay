package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type StepHooks struct {
	BeforeCreate []func(ctx context.Context, step *models.Step, userID string) error
	AfterCreate  []func(ctx context.Context, step *models.Step, userID string) error
	BeforeDelete []func(ctx context.Context, stepID string, userID string) error
	AfterDelete  []func(ctx context.Context, stepID string, userID string) error
}
