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

func insertUser(t *testing.T, db bun.IDB) string {
	t.Helper()
	id := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", id).Exec(context.Background())
	require.NoError(t, err)
	return id
}

func insertOrganization(t *testing.T, db bun.IDB, ownerID string, createdAt time.Time) string {
	t.Helper()
	id := uuid.New().String()
	_, err := db.NewRaw(
		"INSERT INTO organizations (id, owner_id, created_at) VALUES (?, ?, ?)",
		id, ownerID, createdAt,
	).Exec(context.Background())
	require.NoError(t, err)
	return id
}

func insertTeam(t *testing.T, db bun.IDB, orgID, name string, createdAt time.Time) string {
	t.Helper()
	id := uuid.New().String()
	_, err := db.NewRaw(
		"INSERT INTO organization_teams (id, organization_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
		id, orgID, name, uuid.NewString(), createdAt,
	).Exec(context.Background())
	require.NoError(t, err)
	return id
}

func insertOrgMember(t *testing.T, db bun.IDB, orgID, userID string) string {
	t.Helper()
	id := uuid.New().String()
	_, err := db.NewRaw(
		"INSERT INTO organization_members (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)",
		id, orgID, userID, "member",
	).Exec(context.Background())
	require.NoError(t, err)
	return id
}

func assignTeamMember(t *testing.T, db bun.IDB, teamID, memberID string) {
	t.Helper()
	_, err := db.NewRaw(
		"INSERT INTO organization_team_members (id, team_id, member_id) VALUES (?, ?, ?)",
		uuid.New().String(), teamID, memberID,
	).Exec(context.Background())
	require.NoError(t, err)
}

// teamAccessFixture is one organization with two teams and four distinct actors,
// covering every branch of the access rule.
type teamAccessFixture struct {
	OrgID string
	// OwnerID owns the organization but has no organization_members row.
	OwnerID string
	// AssignedID is an organization member assigned to AssignedTeamID only.
	AssignedID string
	// UnassignedID is an organization member on no team at all.
	UnassignedID string
	// OutsiderID has no relationship to the organization.
	OutsiderID string

	AssignedTeamID string
	OtherTeamID    string
}

func seedTeamAccessFixture(t *testing.T, db bun.IDB) *teamAccessFixture {
	t.Helper()

	ownerID := insertUser(t, db)
	assignedID := insertUser(t, db)
	unassignedID := insertUser(t, db)
	outsiderID := insertUser(t, db)

	orgID := insertOrganization(t, db, ownerID, time.Now())
	assignedTeamID := insertTeam(t, db, orgID, "Assigned Team", time.Now())
	otherTeamID := insertTeam(t, db, orgID, "Other Team", time.Now())

	assignedMemberID := insertOrgMember(t, db, orgID, assignedID)
	insertOrgMember(t, db, orgID, unassignedID)
	assignTeamMember(t, db, assignedTeamID, assignedMemberID)

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

func TestBunTeamsRepository_GetAllAccessibleByUserIDDeduplicatesOwnerWhoIsAlsoAMember(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := teamsrepo.NewBunTeamsRepository(teamsDB)

	// Arrange
	fixture := seedTeamAccessFixture(t, teamsDB)
	ownerMemberID := insertOrgMember(t, teamsDB, fixture.OrgID, fixture.OwnerID)
	assignTeamMember(t, teamsDB, fixture.AssignedTeamID, ownerMemberID)

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
	ownerID := insertUser(t, teamsDB)
	base := time.Now()

	olderOrg := insertOrganization(t, teamsDB, ownerID, base.Add(-2*time.Hour))
	newerOrg := insertOrganization(t, teamsDB, ownerID, base.Add(-time.Hour))

	olderOrgOldTeam := insertTeam(t, teamsDB, olderOrg, "older org old team", base.Add(-90*time.Minute))
	olderOrgNewTeam := insertTeam(t, teamsDB, olderOrg, "older org new team", base.Add(-80*time.Minute))
	newerOrgOldTeam := insertTeam(t, teamsDB, newerOrg, "newer org old team", base.Add(-50*time.Minute))
	newerOrgNewTeam := insertTeam(t, teamsDB, newerOrg, "newer org new team", base.Add(-40*time.Minute))

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
	outsiderID := insertUser(t, teamsDB)

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
			// Guards the precedence of the access rule against the team-id filter. If
			// the two were ever combined without parentheses, the owner disjunct would
			// ignore the team id and hand this caller back one of their own teams.
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
