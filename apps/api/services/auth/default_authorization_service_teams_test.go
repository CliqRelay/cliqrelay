package auth_test

import (
	"context"
	"testing"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	authservice "github.com/CliqRelay/cliqrelay/services/auth"
)

func TestDefaultAuthorizationService_CanAccessTeam(t *testing.T) {
	t.Parallel()

	runAuthzCases(t, []authzCase{
		{
			name:  "accessible team is allowed without any scope",
			team:  accessibleTeam(),
			actor: newActor(),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(),
			wantErr: constants.ErrTeamAccessDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     errLookup,
			actor:   newActor(),
			wantErr: errLookup,
		},
	}, func(svc *authservice.DefaultAuthorizationService, actor *authulamodels.Actor, _ *models.Guide) error {
		return svc.CanAccessTeam(context.Background(), actor, testTeamID)
	})
}
