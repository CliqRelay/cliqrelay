package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepHooks struct {
	BeforeCreate func(ctx context.Context, actor *authulamodels.Actor, req *types.CreateStepRequest) error
	AfterCreate  func(ctx context.Context, actor *authulamodels.Actor, step *models.Step) error
	BeforeUpdate func(ctx context.Context, actor *authulamodels.Actor, req *types.UpdateStepRequest) error
	AfterUpdate  func(ctx context.Context, actor *authulamodels.Actor, step *models.Step) error
	BeforeDelete func(ctx context.Context, actor *authulamodels.Actor, step *models.Step) error
	AfterDelete  func(ctx context.Context, actor *authulamodels.Actor, stepID string) error
}
