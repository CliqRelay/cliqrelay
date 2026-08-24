package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type TeamsRepository interface {
	// GetAllAccessibleByUserID returns every team the user owns or is a part of.
	GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error)
	// GetAccessibleByUserID returns the team the user is a part of or null.
	GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error)
}
