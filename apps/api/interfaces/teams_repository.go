package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type TeamsRepository interface {
	// GetAllAccessibleByUserID returns every team the user owns or is assigned to.
	GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error)
	// GetAccessibleByUserID returns the team if the user can reach it, else (nil, nil).
	GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error)
}
