package usecases_test

import (
	"context"
	"errors"
	"testing"

	authulamodels "github.com/Authula/authula/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestTeamsUseCase_List(t *testing.T) {
	t.Parallel()

	serviceErr := errors.New("database is down")
	rows := []*models.Team{{ID: "team-1", OwnerID: "owner-1"}}

	cases := []struct {
		name       string
		actor      *authulamodels.Actor
		setup      func(*tests.MockTeamsService)
		wantErr    error
		wantResult []*models.Team
	}{
		{
			name:  "returns the teams the service returns",
			actor: &authulamodels.Actor{ID: "user-1"},
			setup: func(svc *tests.MockTeamsService) {
				svc.On("GetAllAccessibleByUserID", context.Background(), "user-1").Return(rows, nil)
			},
			wantResult: rows,
		},
		{
			name:  "propagates service errors so they surface as 500",
			actor: &authulamodels.Actor{ID: "user-1"},
			setup: func(svc *tests.MockTeamsService) {
				svc.On("GetAllAccessibleByUserID", context.Background(), "user-1").Return(nil, serviceErr)
			},
			wantErr: serviceErr,
		},
		{
			name:    "rejects a missing actor",
			actor:   nil,
			setup:   func(*tests.MockTeamsService) {},
			wantErr: constants.ErrUnauthorized,
		},
		{
			name:    "rejects an actor without an id",
			actor:   &authulamodels.Actor{},
			setup:   func(*tests.MockTeamsService) {},
			wantErr: constants.ErrUnauthorized,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			svc := new(tests.MockTeamsService)
			tt.setup(svc)
			uc := usecases.NewTeamsUseCase(svc)

			// Act
			got, err := uc.List(context.Background(), tt.actor)

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantResult, got)
			}
			svc.AssertExpectations(t)
		})
	}
}
