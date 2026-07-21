package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/types"
)

type StarredGuidesRepository interface {
	GetAll(ctx context.Context, filter *types.GuideFilter) ([]*types.GuideWithStarred, error)
	Star(ctx context.Context, workspaceID string, userID string, guideID uuid.UUID) error
	Unstar(ctx context.Context, workspaceID string, userID string, guideID uuid.UUID) error
}
