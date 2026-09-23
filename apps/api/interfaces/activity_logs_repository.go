package interfaces

import (
	"context"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
)

type ActivityLogsRepository interface {
	Insert(ctx context.Context, log *models.ActivityLog) (bool, error)
	InsertOrMergeUpdate(ctx context.Context, log *models.ActivityLog, window time.Duration) (*models.ActivityLog, bool, error)
	ListByTeam(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error)
	DeleteByTarget(ctx context.Context, targetType, targetID string) error
	SyncGuideVisibility(ctx context.Context, guideID string, visibility models.Visibility) error
	GetUserByID(ctx context.Context, userID string) (*authulamodels.User, error)
	// GetTeamOrganizationID returns the team's organization, or uuid.Nil when the team does not exist.
	GetTeamOrganizationID(ctx context.Context, teamID uuid.UUID) (uuid.UUID, error)
}
