package usecases_test

import (
	"context"
	"errors"
	"testing"

	coreerrors "github.com/Authula/authula/core/errors"
	authulamodels "github.com/Authula/authula/models"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestOrganizationsUseCase_GetMyMembership(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.Actor{ID: "user-1", Type: authulamodels.ActorUser}

	cases := []struct {
		name    string
		actor   *authulamodels.Actor
		setup   func(*tests.MockOrgMembershipAPI)
		wantErr error
		want    *orgtypes.OrganizationMemberResponse
	}{
		{
			name:  "returns the caller's admin row",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").
					Return(&orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "admin"}, nil).Once()
			},
			want: &orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "admin"},
		},
		{
			name:  "returns the caller's editor row",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").
					Return(&orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "editor"}, nil).Once()
			},
			want: &orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "editor"},
		},
		{
			name:  "returns the caller's viewer row",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").
					Return(&orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "viewer"}, nil).Once()
			},
			want: &orgtypes.OrganizationMemberResponse{ID: "m-1", OrganizationID: "org-1", Role: "viewer"},
		},
		{
			name:  "hides a non-member as not found",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").Return(nil, coreerrors.ErrForbidden).Once()
			},
			wantErr: constants.ErrOrganizationMemberNotFound,
		},
		{
			name:  "hides a missing organization as not found",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").Return(nil, coreerrors.ErrNotFound).Once()
			},
			wantErr: constants.ErrOrganizationMemberNotFound,
		},
		{
			name:  "hides lookup failures as not found",
			actor: actor,
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, actor, "org-1", "user-1").Return(nil, errors.New("boom")).Once()
			},
			wantErr: constants.ErrOrganizationMemberNotFound,
		},
		{
			name:    "rejects a missing actor",
			actor:   nil,
			setup:   func(*tests.MockOrgMembershipAPI) {},
			wantErr: constants.ErrUnauthorized,
		},
		{
			name:    "rejects an actor without an id",
			actor:   &authulamodels.Actor{},
			setup:   func(*tests.MockOrgMembershipAPI) {},
			wantErr: constants.ErrUnauthorized,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			api := new(tests.MockOrgMembershipAPI)
			tt.setup(api)
			uc := usecases.NewOrganizationsUseCase(api)

			// Act
			got, err := uc.GetMyMembership(context.Background(), tt.actor, "org-1")

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.want, got)
			}
			api.AssertExpectations(t)
		})
	}
}
