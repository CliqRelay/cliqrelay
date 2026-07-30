package interfaces

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type GuideViewsService interface {
	RecordView(ctx context.Context, teamID, guideID uuid.UUID, viewerID *uuid.UUID, ipHash, userAgent, viewedAt string) error
	GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error)
}
