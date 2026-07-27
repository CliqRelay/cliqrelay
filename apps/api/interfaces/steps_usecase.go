package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsUseCase interface {
	Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateStepRequest) (*models.Step, error)
	ListByGuide(ctx context.Context, actor *authulamodels.Actor, guideID string) ([]*models.Step, error)
	Get(ctx context.Context, actor *authulamodels.Actor, stepID string) (*models.Step, error)
	Update(ctx context.Context, actor *authulamodels.Actor, stepID string, req *types.UpdateStepRequest) (*models.Step, error)
	Delete(ctx context.Context, actor *authulamodels.Actor, stepID string) error
	Reorder(ctx context.Context, actor *authulamodels.Actor, req *types.ReorderStepsRequest) ([]*models.Step, error)
	Duplicate(ctx context.Context, actor *authulamodels.Actor, stepID string, req *types.DuplicateStepRequest) (*models.Step, error)
}
