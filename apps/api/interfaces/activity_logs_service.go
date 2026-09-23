package interfaces

import (
	"context"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/models"
)

type ActivityLogsService interface {
	Record(ctx context.Context, payload *events.ActivityRecordedPayload) error
	List(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error)
	DeleteByTarget(ctx context.Context, targetType, targetID string) error
}
