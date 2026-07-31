package interfaces

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
)

type GuideViewsService interface {
	RecordView(ctx context.Context, teamID uuid.UUID, guide *models.Guide, viewerID *uuid.UUID, ipHash, userAgent, viewedAt string) error
	FlushGuideDedupeKeys(ctx context.Context, guideID uuid.UUID) error
	GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error)
	GetTimeSavedByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error)
}
