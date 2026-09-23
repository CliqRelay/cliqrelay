package usecases_test

import (
	"context"
	"testing"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestActivityLogsUseCase_List(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.Actor{ID: "user-1"}
	teamID := uuid.New()
	rows := []*models.ActivityLog{{ID: uuid.New()}}

	cases := []struct {
		name      string
		teamID    string
		limit     int
		authzErr  error
		wantLimit int
		wantErr   error
	}{
		{name: "defaults the limit", teamID: teamID.String(), limit: 0, wantLimit: 10},
		{name: "keeps an in-range limit", teamID: teamID.String(), limit: 25, wantLimit: 25},
		{name: "clamps a large limit", teamID: teamID.String(), limit: 500, wantLimit: 50},
		{name: "defaults a negative limit", teamID: teamID.String(), limit: -3, wantLimit: 10},
		{name: "rejects non-members", teamID: teamID.String(), authzErr: constants.ErrTeamAccessDenied, wantErr: constants.ErrTeamAccessDenied},
		{name: "rejects an invalid team id", teamID: "nope", wantErr: constants.ErrTeamNotFound},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			authz := new(tests.MockAuthorizationService)
			svc := new(tests.MockActivityLogsService)
			authz.On("GuideListFilter", mock.Anything, actor, tt.teamID).
				Return(&types.GuideFilter{ViewerUserID: new("viewer-1")}, tt.authzErr).Maybe()
			if tt.wantErr == nil {
				svc.On("List", mock.Anything, teamID, "viewer-1", tt.wantLimit).Return(rows, nil).Once()
			}

			got, err := usecases.NewActivityLogsUseCase(authz, svc).List(context.Background(), actor, tt.teamID, tt.limit)

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				require.NoError(t, err)
				assert.Equal(t, rows, got)
			}
			svc.AssertExpectations(t)
		})
	}
}
