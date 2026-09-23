package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
)

type ActivityLogsUseCase interface {
	List(ctx context.Context, actor *authulamodels.Actor, teamID string, limit int) ([]*models.ActivityLog, error)
}
