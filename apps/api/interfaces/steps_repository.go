package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsRepository interface {
	Create(ctx context.Context, dto *types.CreateStepDTO) (*models.Step, error)
	GetByID(ctx context.Context, id string) (*models.Step, error)
	GetByGuideID(ctx context.Context, guideID string) ([]*models.Step, error)
	Update(ctx context.Context, dto *types.UpdateStepDTO) (*models.Step, error)
	Delete(ctx context.Context, id string) error
	Reorder(ctx context.Context, guideID string, targetStepID string, prevStepID *string, nextStepID *string) ([]*models.Step, error)
	Tx(ctx context.Context, fn func(ctx context.Context, repo StepsRepository) error) error
}
