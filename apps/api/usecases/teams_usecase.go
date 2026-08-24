package usecases

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

type TeamsUseCase struct {
	teamsService interfaces.TeamsService
}

func NewTeamsUseCase(teamsService interfaces.TeamsService) *TeamsUseCase {
	return &TeamsUseCase{teamsService: teamsService}
}

// List returns every team the actor can reach. There is no AuthorizationService
// call here: there is no specific resource to authorize against, and the
// repository's WHERE clause is itself the authorization, scoped by actor.ID.
func (uc *TeamsUseCase) List(ctx context.Context, actor *authulamodels.Actor) ([]*models.Team, error) {
	if actor == nil || actor.ID == "" {
		return nil, constants.ErrUnauthorized
	}

	return uc.teamsService.GetAllAccessibleByUserID(ctx, actor.ID)
}
