package teams_test

import (
	"context"
	"errors"
	"testing"

	orgtypes "github.com/Authula/authula/plugins/organizations/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	teamsservice "github.com/CliqRelay/cliqrelay/services/teams"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestTeamsService_GetAllAccessibleByUserID(t *testing.T) {
	t.Parallel()

	repoErr := errors.New("database is down")

	cases := []struct {
		name    string
		rows    []*models.Team
		repoErr error
	}{
		{
			name: "returns the rows the repository returns",
			rows: []*models.Team{{OrganizationTeam: orgtypes.OrganizationTeam{ID: "team-1"}, OwnerID: "owner-1"}},
		},
		{
			name: "returns an empty result untouched",
			rows: []*models.Team{},
		},
		{
			name:    "propagates repository errors",
			repoErr: repoErr,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			ctx := context.Background()
			repo := new(tests.MockTeamsRepository)
			repo.On("GetAllAccessibleByUserID", ctx, "user-1").Return(tt.rows, tt.repoErr)
			svc := teamsservice.NewTeamsService(repo)

			// Act
			got, err := svc.GetAllAccessibleByUserID(ctx, "user-1")

			// Assert
			if tt.repoErr != nil {
				assert.ErrorIs(t, err, tt.repoErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.rows, got)
			}
			repo.AssertExpectations(t)
		})
	}
}

func TestTeamsService_GetAccessibleByUserID(t *testing.T) {
	t.Parallel()

	repoErr := errors.New("database is down")

	cases := []struct {
		name    string
		row     *models.Team
		repoErr error
	}{
		{
			name: "returns the team the repository returns",
			row:  &models.Team{OrganizationTeam: orgtypes.OrganizationTeam{ID: "team-1"}, OwnerID: "owner-1"},
		},
		{
			name: "passes an inaccessible team through as nil",
		},
		{
			name:    "propagates repository errors",
			repoErr: repoErr,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			ctx := context.Background()
			repo := new(tests.MockTeamsRepository)
			repo.On("GetAccessibleByUserID", ctx, "user-1", "team-1").Return(tt.row, tt.repoErr)
			svc := teamsservice.NewTeamsService(repo)

			// Act
			got, err := svc.GetAccessibleByUserID(ctx, "user-1", "team-1")

			// Assert
			if tt.repoErr != nil {
				assert.ErrorIs(t, err, tt.repoErr)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tt.row, got)
			repo.AssertExpectations(t)
		})
	}
}
