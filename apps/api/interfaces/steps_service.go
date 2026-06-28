package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsService interface {
	Create(ctx context.Context, req *types.CreateStepRequest) (*models.Step, error)
	GetByID(ctx context.Context, stepID string) (*models.Step, error)
	GetByGuideID(ctx context.Context, guideID string) ([]*models.Step, error)
	Update(ctx context.Context, stepID string, req *types.UpdateStepRequest) (*models.Step, error)
	Delete(ctx context.Context, stepID string) error
	Reorder(ctx context.Context, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error)
	Duplicate(ctx context.Context, stepID string, req *types.DuplicateStepRequest) (*models.Step, error)
}
