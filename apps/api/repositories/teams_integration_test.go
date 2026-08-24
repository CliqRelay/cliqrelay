package repositories_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	teamsrepo "github.com/CliqRelay/cliqrelay/repositories/teams"
)

func ptr[T any](v T) *T { return &v }

type teamAccessFixture struct {
	OrgID          string
	OwnerID        string
	AssignedID     string
	UnassignedID   string
	OutsiderID     string
	AssignedTeamID string
	OtherTeamID    string
}

func seedTeamAccessFixture(t *testing.T, db bun.IDB) *teamAccessFixture {
	t.Helper()

	ctx := context.Background()

	ownerID := insertTestUser(ctx, db, t)
	assignedID := insertTestUser(ctx, db, t)
	unassignedID := insertTestUser(ctx, db, t)
	outsiderID := insertTestUser(ctx, db, t)

	orgID := insertTestOrganizationOwnedBy(ctx, db, t, ownerID, nil)
	assignedTeamID := insertTestTeam(ctx, db, t, orgID, "Assigned Team", nil)
	otherTeamID := insertTestTeam(ctx, db, t, orgID, "Other Team", nil)

	assignedMemberID := insertTestOrgMember(ctx, db, t, orgID, assignedID)
	insertTestOrgMember(ctx, db, t, orgID, unassignedID)
	assignTestTeamMember(ctx, db, t, assignedTeamID, assignedMemberID)

	return &teamAccessFixture{
		OrgID:          orgID,
		OwnerID:        ownerID,
		AssignedID:     assignedID,
		UnassignedID:   unassignedID,
		OutsiderID:     outsiderID,
		AssignedTeamID: assignedTeamID,
		OtherTeamID:    otherTeamID,
	}
}

func TestBunTeamsRepository_GetAllAccessibleByUserID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	cases := []struct {
		name  string
		actor func(*teamAccessFixture) string
		want  func(*teamAccessFixture) []string
	}{
		{
			name:  "org owner sees every team in their org even with no membership row",
			actor: func(f *teamAccessFixture) string { return f.OwnerID },
			want:  func(f *teamAccessFixture) []string { return []string{f.AssignedTeamID, f.OtherTeamID} },
		},
		{
			name:  "assigned team member sees only the teams they are assigned to",
			actor: func(f *teamAccessFixture) string { return f.AssignedID },
			want:  func(f *teamAccessFixture) []string { return []string{f.AssignedTeamID} },
		},
		{
			name:  "org member on no team sees nothing",
			actor: func(f *teamAccessFixture) string { return f.UnassignedID },
			want:  func(*teamAccessFixture) []string { return []string{} },
		},
		{
			name:  "outsider sees nothing",
			actor: func(f *teamAccessFixture) string { return f.OutsiderID },
			want:  func(*teamAccessFixture) []string { return []string{} },
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			fixture := seedTeamAccessFixture(t, teamsDB)

			// Act
			teams, err := repo.GetAllAccessibleByUserID(ctx, tt.actor(fixture))

			// Assert
			require.NoError(t, err)
			got := make([]string, 0, len(teams))
			for _, team := range teams {
				got = append(got, team.ID)
			}
			assert.ElementsMatch(t, tt.want(fixture), got)
		})
	}
}

func TestBunTeamsRepository_MembershipInOneOrganizationCannotReachATeamInAnother(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	userID := insertTestUser(ctx, teamsDB, t)
	otherOwnerID := insertTestUser(ctx, teamsDB, t)

	homeOrgID := insertTestOrganizationOwnedBy(ctx, teamsDB, t, otherOwnerID, nil)
	foreignOrgID := insertTestOrganizationOwnedBy(ctx, teamsDB, t, otherOwnerID, nil)
	foreignTeamID := insertTestTeam(ctx, teamsDB, t, foreignOrgID, "Foreign Team", nil)

	// The user's membership belongs to homeOrg, but is assigned to foreignOrg's team.
	homeMemberID := insertTestOrgMember(ctx, teamsDB, t, homeOrgID, userID)
	assignTestTeamMember(ctx, teamsDB, t, foreignTeamID, homeMemberID)

	// Act
	all, listErr := repo.GetAllAccessibleByUserID(ctx, userID)
	one, lookupErr := repo.GetAccessibleByUserID(ctx, userID, foreignTeamID)

	// Assert
	require.NoError(t, listErr)
	assert.Empty(t, all, "a membership in another organization must not admit the team")
	require.NoError(t, lookupErr)
	assert.Nil(t, one)
}

func TestBunTeamsRepository_GetAllAccessibleByUserIDDeduplicatesOwnerWhoIsAlsoAMember(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	fixture := seedTeamAccessFixture(t, teamsDB)
	ownerMemberID := insertTestOrgMember(ctx, teamsDB, t, fixture.OrgID, fixture.OwnerID)
	assignTestTeamMember(ctx, teamsDB, t, fixture.AssignedTeamID, ownerMemberID)

	// Act
	teams, err := repo.GetAllAccessibleByUserID(ctx, fixture.OwnerID)

	// Assert
	require.NoError(t, err)
	seen := make(map[string]int, len(teams))
	for _, team := range teams {
		seen[team.ID]++
	}
	assert.Equal(t, map[string]int{fixture.AssignedTeamID: 1, fixture.OtherTeamID: 1}, seen)
}

func TestBunTeamsRepository_GetAllAccessibleByUserIDReturnsTheOrganizationOwner(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	fixture := seedTeamAccessFixture(t, teamsDB)

	// Act
	teams, err := repo.GetAllAccessibleByUserID(ctx, fixture.AssignedID)

	// Assert
	require.NoError(t, err)
	require.Len(t, teams, 1)
	assert.Equal(t, fixture.OwnerID, teams[0].OwnerID, "owner_id must be the org owner, not the querying user")
	assert.Equal(t, fixture.OrgID, teams[0].OrganizationID)
	assert.Equal(t, "Assigned Team", teams[0].Name)
	assert.False(t, teams[0].CreatedAt.IsZero())
	assert.False(t, teams[0].UpdatedAt.IsZero())
}

func TestBunTeamsRepository_GetAllAccessibleByUserIDOrdersOrganizationsThenTeamsNewestFirst(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	ownerID := insertTestUser(ctx, teamsDB, t)
	base := time.Now()

	olderOrg := insertTestOrganizationOwnedBy(ctx, teamsDB, t, ownerID, ptr(base.Add(-2*time.Hour)))
	newerOrg := insertTestOrganizationOwnedBy(ctx, teamsDB, t, ownerID, ptr(base.Add(-time.Hour)))

	olderOrgOldTeam := insertTestTeam(ctx, teamsDB, t, olderOrg, "older org old team", ptr(base.Add(-90*time.Minute)))
	olderOrgNewTeam := insertTestTeam(ctx, teamsDB, t, olderOrg, "older org new team", ptr(base.Add(-80*time.Minute)))
	newerOrgOldTeam := insertTestTeam(ctx, teamsDB, t, newerOrg, "newer org old team", ptr(base.Add(-50*time.Minute)))
	newerOrgNewTeam := insertTestTeam(ctx, teamsDB, t, newerOrg, "newer org new team", ptr(base.Add(-40*time.Minute)))

	// Act
	teams, err := repo.GetAllAccessibleByUserID(ctx, ownerID)

	// Assert
	require.NoError(t, err)
	got := make([]string, 0, len(teams))
	for _, team := range teams {
		got = append(got, team.ID)
	}
	assert.Equal(t, []string{newerOrgNewTeam, newerOrgOldTeam, olderOrgNewTeam, olderOrgOldTeam}, got)
}

func TestBunTeamsRepository_GetAllAccessibleByUserIDReturnsEmptySliceNotNil(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	outsiderID := insertTestUser(ctx, teamsDB, t)

	// Act
	teams, err := repo.GetAllAccessibleByUserID(ctx, outsiderID)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, teams)
	assert.Empty(t, teams)
}

func TestBunTeamsRepository_GetAccessibleByUserID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	cases := []struct {
		name   string
		actor  func(*teamAccessFixture) string
		teamID func(*teamAccessFixture) string
		want   func(*teamAccessFixture) string // "" means no team
	}{
		{
			name:   "org owner reaches a team they are not assigned to",
			actor:  func(f *teamAccessFixture) string { return f.OwnerID },
			teamID: func(f *teamAccessFixture) string { return f.OtherTeamID },
			want:   func(f *teamAccessFixture) string { return f.OtherTeamID },
		},
		{
			name:   "assigned member reaches their team",
			actor:  func(f *teamAccessFixture) string { return f.AssignedID },
			teamID: func(f *teamAccessFixture) string { return f.AssignedTeamID },
			want:   func(f *teamAccessFixture) string { return f.AssignedTeamID },
		},
		{
			name:   "assigned member cannot reach a team they are not on",
			actor:  func(f *teamAccessFixture) string { return f.AssignedID },
			teamID: func(f *teamAccessFixture) string { return f.OtherTeamID },
			want:   func(*teamAccessFixture) string { return "" },
		},
		{
			name:   "outsider cannot reach the team",
			actor:  func(f *teamAccessFixture) string { return f.OutsiderID },
			teamID: func(f *teamAccessFixture) string { return f.AssignedTeamID },
			want:   func(*teamAccessFixture) string { return "" },
		},
		{
			name:   "an org owner cannot reach a team in an organization they do not own",
			actor:  func(*teamAccessFixture) string { return seedTeamAccessFixture(t, teamsDB).OwnerID },
			teamID: func(f *teamAccessFixture) string { return f.AssignedTeamID },
			want:   func(*teamAccessFixture) string { return "" },
		},
		{
			name:   "unknown team id yields no team",
			actor:  func(f *teamAccessFixture) string { return f.OwnerID },
			teamID: func(*teamAccessFixture) string { return uuid.New().String() },
			want:   func(*teamAccessFixture) string { return "" },
		},
		{
			name:   "malformed team id yields no team rather than a database error",
			actor:  func(f *teamAccessFixture) string { return f.OwnerID },
			teamID: func(*teamAccessFixture) string { return "not-a-uuid" },
			want:   func(*teamAccessFixture) string { return "" },
		},
		{
			name:   "a urn:uuid team id resolves rather than erroring",
			actor:  func(f *teamAccessFixture) string { return f.OwnerID },
			teamID: func(f *teamAccessFixture) string { return "urn:uuid:" + f.AssignedTeamID },
			want:   func(f *teamAccessFixture) string { return f.AssignedTeamID },
		},
		{
			name:   "a braced team id resolves rather than erroring",
			actor:  func(f *teamAccessFixture) string { return f.OwnerID },
			teamID: func(f *teamAccessFixture) string { return "{" + f.AssignedTeamID + "}" },
			want:   func(f *teamAccessFixture) string { return f.AssignedTeamID },
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			fixture := seedTeamAccessFixture(t, teamsDB)

			// Act
			team, err := repo.GetAccessibleByUserID(ctx, tt.actor(fixture), tt.teamID(fixture))

			// Assert
			require.NoError(t, err)
			if want := tt.want(fixture); want == "" {
				assert.Nil(t, team)
			} else {
				require.NotNil(t, team)
				assert.Equal(t, want, team.ID)
				assert.Equal(t, fixture.OwnerID, team.OwnerID)
				assert.Equal(t, fixture.OrgID, team.OrganizationID)
			}
		})
	}
}
