package interfaces

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/types"
)

type GuideViewsRepository interface {
	Create(ctx context.Context, dto *types.CreateGuideViewDTO) error
	GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error)
	GetTimeSavedByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) ([]*types.GuideViewStats, error)
}
