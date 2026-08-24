package auth_test

import (
	"context"
	"errors"
	"testing"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	orgconstants "github.com/Authula/authula/plugins/organizations/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	authservice "github.com/CliqRelay/cliqrelay/services/auth"
	"github.com/CliqRelay/cliqrelay/tests"
)

const (
	testTeamID  = "6f7e8d9c-0a1b-4c2d-8e3f-4a5b6c7d8e9f"
	testOrgID   = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
	testActorID = "test-user-123"
)

// lookupErr stands in for a database or connectivity failure. It must reach the
// caller unwrapped so utils.ErrorStatus maps it to 500 rather than a 403 that
// would tell every user they had lost access during an outage.
var lookupErr = errors.New("database is down")

func newActor(scopes ...string) *authulamodels.Actor {
	return &authulamodels.Actor{ID: testActorID, Type: authulamodels.ActorUser, Scopes: scopes}
}

func accessibleTeam() *models.Team {
	return &models.Team{ID: testTeamID, OrganizationID: testOrgID, OwnerID: "org-owner-1"}
}

// newService builds the service with a stubbed teams service. The plugin API is
// only reached by GuideListFilterByOrganization, which these tests do not touch.
func newService(t *testing.T, team *models.Team, lookupErr error) (*authservice.DefaultAuthorizationService, *tests.MockTeamsService) {
	t.Helper()
	teamsService := new(tests.MockTeamsService)
	teamsService.On("GetAccessibleByUserID", mock.Anything, testActorID, testTeamID).Return(team, lookupErr)
	return authservice.NewDefaultAuthorizationService(organizationsplugin.API{}, teamsService), teamsService
}

func publicGuide() *models.Guide {
	creator := "someone-else"
	return &models.Guide{Visibility: models.VisibilityTeam, CreatorID: &creator}
}

func privateGuideByAnotherUser() *models.Guide {
	creator := "someone-else"
	return &models.Guide{Visibility: models.VisibilityPrivate, CreatorID: &creator}
}

type authzCase struct {
	name    string
	team    *models.Team
	err     error
	actor   *authulamodels.Actor
	guide   *models.Guide
	wantErr error
}

func runAuthzCases(t *testing.T, cases []authzCase, call func(*authservice.DefaultAuthorizationService, *authulamodels.Actor, *models.Guide) error) {
	t.Helper()

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			svc, teamsService := newService(t, tt.team, tt.err)

			// Act
			err := call(svc, tt.actor, tt.guide)

			// Assert
			if tt.wantErr == nil {
				require.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
			teamsService.AssertExpectations(t)
		})
	}
}

func TestDefaultAuthorizationService_CanCreateGuide(t *testing.T) {
	t.Parallel()

	runAuthzCases(t, []authzCase{
		{
			name:  "accessible team and sufficient scope is allowed",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesCreatePermission),
		},
		{
			// An org owner with no organization_team_members row now resolves to an
			// accessible team, where before they were denied. The rule itself lives in
			// the repository query and is covered by
			// TestBunTeamsRepository_GetAllAccessibleByUserID; here we only assert that
			// the service grants access to whatever the repository deems accessible.
			name:  "a team the repository deems accessible is allowed regardless of membership",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesCreatePermission),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(constants.GuidesCreatePermission),
			wantErr: constants.ErrTeamAccessDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			actor:   newActor(constants.GuidesCreatePermission),
			wantErr: lookupErr,
		},
		{
			name:    "missing scope is denied",
			team:    accessibleTeam(),
			actor:   newActor(constants.GuidesReadPermission),
			wantErr: constants.ErrGuideCreateDenied,
		},
	}, func(svc *authservice.DefaultAuthorizationService, actor *authulamodels.Actor, _ *models.Guide) error {
		return svc.CanCreateGuide(context.Background(), actor, testTeamID)
	})
}

func TestDefaultAuthorizationService_CanReadGuide(t *testing.T) {
	t.Parallel()

	runAuthzCases(t, []authzCase{
		{
			name:  "accessible team and sufficient scope is allowed",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesReadPermission),
			guide: publicGuide(),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(constants.GuidesReadPermission),
			guide:   publicGuide(),
			wantErr: constants.ErrGuideAccessDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			actor:   newActor(constants.GuidesReadPermission),
			guide:   publicGuide(),
			wantErr: lookupErr,
		},
		{
			name:    "missing scope is denied",
			team:    accessibleTeam(),
			actor:   newActor(),
			guide:   publicGuide(),
			wantErr: constants.ErrGuideAccessDenied,
		},
		{
			name:    "private guide by another creator is denied",
			team:    accessibleTeam(),
			actor:   newActor(constants.GuidesReadPermission),
			guide:   privateGuideByAnotherUser(),
			wantErr: constants.ErrGuideReadDenied,
		},
	}, func(svc *authservice.DefaultAuthorizationService, actor *authulamodels.Actor, guide *models.Guide) error {
		return svc.CanReadGuide(context.Background(), actor, testTeamID, guide)
	})
}

func TestDefaultAuthorizationService_CanEditGuide(t *testing.T) {
	t.Parallel()

	runAuthzCases(t, []authzCase{
		{
			name:  "accessible team and sufficient scope is allowed",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesEditPermission),
			guide: publicGuide(),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(constants.GuidesEditPermission),
			guide:   publicGuide(),
			wantErr: constants.ErrGuideEditDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			actor:   newActor(constants.GuidesEditPermission),
			guide:   publicGuide(),
			wantErr: lookupErr,
		},
		{
			name:    "private guide by another creator is denied",
			team:    accessibleTeam(),
			actor:   newActor(constants.GuidesEditPermission),
			guide:   privateGuideByAnotherUser(),
			wantErr: constants.ErrGuideEditDenied,
		},
	}, func(svc *authservice.DefaultAuthorizationService, actor *authulamodels.Actor, guide *models.Guide) error {
		return svc.CanEditGuide(context.Background(), actor, testTeamID, guide)
	})
}

func TestDefaultAuthorizationService_CanDeleteGuide(t *testing.T) {
	t.Parallel()

	ownGuide := func() *models.Guide {
		creator := testActorID
		return &models.Guide{Visibility: models.VisibilityTeam, CreatorID: &creator}
	}

	runAuthzCases(t, []authzCase{
		{
			name:  "the creator may delete their own guide",
			team:  accessibleTeam(),
			actor: newActor(),
			guide: ownGuide(),
		},
		{
			name:  "an org admin may delete another user's team guide",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesDeletePermission, orgconstants.OrganizationsAllPermission),
			guide: publicGuide(),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(constants.GuidesDeletePermission, orgconstants.OrganizationsAllPermission),
			guide:   publicGuide(),
			wantErr: constants.ErrGuideDeleteDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			actor:   newActor(constants.GuidesDeletePermission, orgconstants.OrganizationsAllPermission),
			guide:   publicGuide(),
			wantErr: lookupErr,
		},
		{
			name:    "missing scope is denied",
			team:    accessibleTeam(),
			actor:   newActor(),
			guide:   publicGuide(),
			wantErr: constants.ErrGuideDeleteDenied,
		},
	}, func(svc *authservice.DefaultAuthorizationService, actor *authulamodels.Actor, guide *models.Guide) error {
		return svc.CanDeleteGuide(context.Background(), actor, testTeamID, guide)
	})
}

func TestDefaultAuthorizationService_GuideListFilter(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		team    *models.Team
		err     error
		actor   *authulamodels.Actor
		wantErr error
	}{
		{
			name:  "accessible team and sufficient scope yields a viewer-scoped filter",
			team:  accessibleTeam(),
			actor: newActor(constants.GuidesReadPermission),
		},
		{
			name:    "inaccessible team is denied",
			actor:   newActor(constants.GuidesReadPermission),
			wantErr: constants.ErrGuideAccessDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			actor:   newActor(constants.GuidesReadPermission),
			wantErr: lookupErr,
		},
		{
			name:    "missing scope is denied",
			team:    accessibleTeam(),
			actor:   newActor(),
			wantErr: constants.ErrGuideAccessDenied,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			svc, teamsService := newService(t, tt.team, tt.err)

			// Act
			filter, err := svc.GuideListFilter(context.Background(), tt.actor, testTeamID)

			// Assert
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, filter)
			} else {
				require.NoError(t, err)
				require.NotNil(t, filter)
				require.NotNil(t, filter.ViewerUserID)
				assert.Equal(t, testActorID, *filter.ViewerUserID)
				assert.True(t, filter.AccessibleOnly)
			}
			teamsService.AssertExpectations(t)
		})
	}
}

func TestDefaultAuthorizationService_CanReadTeam(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		team    *models.Team
		err     error
		orgID   string
		wantErr error
	}{
		{
			name: "accessible team with no organization constraint is allowed",
			team: accessibleTeam(),
		},
		{
			name:  "accessible team in the requested organization is allowed",
			team:  accessibleTeam(),
			orgID: testOrgID,
		},
		{
			name:    "a team in another organization is denied rather than reported missing",
			team:    accessibleTeam(),
			orgID:   "99999999-9999-4999-8999-999999999999",
			wantErr: constants.ErrTeamAccessDenied,
		},
		{
			name:    "inaccessible team is denied",
			wantErr: constants.ErrTeamAccessDenied,
		},
		{
			name:    "lookup failure propagates unwrapped",
			err:     lookupErr,
			wantErr: lookupErr,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			svc, teamsService := newService(t, tt.team, tt.err)

			// Act
			err := svc.CanReadTeam(context.Background(), newActor(constants.GuidesReadPermission), tt.orgID, testTeamID)

			// Assert
			if tt.wantErr == nil {
				require.NoError(t, err)
			} else {
				assert.ErrorIs(t, err, tt.wantErr)
			}
			teamsService.AssertExpectations(t)
		})
	}
}

func TestDefaultAuthorizationService_RejectsMissingActorWithoutQueryingTheDatabase(t *testing.T) {
	t.Parallel()

	// Arrange
	teamsService := new(tests.MockTeamsService)
	svc := authservice.NewDefaultAuthorizationService(organizationsplugin.API{}, teamsService)

	// Act
	err := svc.CanCreateGuide(context.Background(), nil, testTeamID)

	// Assert
	assert.ErrorIs(t, err, constants.ErrUnauthorized)
	teamsService.AssertNotCalled(t, "GetAccessibleByUserID", mock.Anything, mock.Anything, mock.Anything)
}
