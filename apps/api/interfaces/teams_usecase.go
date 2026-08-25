package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
)

type TeamsUseCase interface {
	List(ctx context.Context, actor *authulamodels.Actor) ([]*models.Team, error)
}
