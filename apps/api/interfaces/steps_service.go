package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsService interface {
	Create(ctx context.Context, userID string, req *types.CreateStepRequest) (*models.Step, error)
	GetByID(ctx context.Context, userID string, stepID string) (*models.Step, error)
	GetByGuideID(ctx context.Context, userID string, guideID string) ([]*models.Step, error)
	Update(ctx context.Context, userID string, stepID string, req *types.UpdateStepRequest) (*models.Step, error)
	Delete(ctx context.Context, userID string, stepID string) error
	Reorder(ctx context.Context, userID string, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error)
	Duplicate(ctx context.Context, userID string, stepID string, req *types.DuplicateStepRequest) (*models.Step, error)
}
