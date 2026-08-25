package repositories_test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/tests"
)

var (
	guidesDB      *bun.DB
	stepsDB       *bun.DB
	mediaAssetsDB *bun.DB
	guideViewsDB  *bun.DB
	teamsDB       *bun.DB
)

func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	dsn, cleanupContainer, err := tests.StartPostgresContainer(ctx)
	if err != nil {
		println("ERROR: StartPostgresContainer:", err.Error())
		cleanupContainer()
		os.Exit(1)
	}

	var cleanups []func()

	guidesDB, _, err = tests.SetupTestSchema("guides", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		_ = guidesDB.Close()
	})

	stepsDB, _, err = tests.SetupTestSchema("steps", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		_ = stepsDB.Close()
	})

	mediaAssetsDB, _, err = tests.SetupTestSchema("media_assets", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		_ = mediaAssetsDB.Close()
	})

	guideViewsDB, _, err = tests.SetupTestSchema("guide_views", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		_ = guideViewsDB.Close()
	})

	teamsDB, _, err = tests.SetupTestSchema("teams", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		_ = teamsDB.Close()
	})

	code := m.Run()

	for i := len(cleanups) - 1; i >= 0; i-- {
		cleanups[i]()
	}
	cleanupContainer()

	os.Exit(code)
}

func runCleanups(cleanups []func()) {
	for i := len(cleanups) - 1; i >= 0; i-- {
		cleanups[i]()
	}
}

// The fixture helpers below insert into Authula-owned tables. The test schema is
// built from Authula's own migrations, so these have to satisfy the real
// constraints: users.name and users.email are NOT NULL with email unique,
// organizations.slug is globally unique, and organization_members.role is NOT NULL.

func insertTestUser(ctx context.Context, db bun.IDB, t *testing.T) string {
	t.Helper()
	id := uuid.New().String()
	insertTestUserWithID(ctx, db, t, id)
	return id
}

func insertTestUserWithID(ctx context.Context, db bun.IDB, t *testing.T, id string) {
	t.Helper()
	_, err := db.NewRaw(
		"INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
		id, "Test User", fmt.Sprintf("user-%s@example.test", id),
	).Exec(ctx)
	require.NoError(t, err)
}

func insertTestOrganizationOwnedBy(ctx context.Context, db bun.IDB, t *testing.T, ownerID string, createdAt *time.Time) string {
	t.Helper()
	id := uuid.New().String()
	if createdAt == nil {
		_, err := db.NewRaw(
			"INSERT INTO organizations (id, owner_id, name, slug) VALUES (?, ?, ?, ?)",
			id, ownerID, "Test Organization", "org-"+id,
		).Exec(ctx)
		require.NoError(t, err)
		return id
	}
	_, err := db.NewRaw(
		"INSERT INTO organizations (id, owner_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
		id, ownerID, "Test Organization", "org-"+id, *createdAt,
	).Exec(ctx)
	require.NoError(t, err)
	return id
}

func insertTestTeam(ctx context.Context, db bun.IDB, t *testing.T, orgID, name string, createdAt *time.Time) string {
	t.Helper()
	id := uuid.New().String()
	if createdAt == nil {
		_, err := db.NewRaw(
			"INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)",
			id, orgID, name, "team-"+id,
		).Exec(ctx)
		require.NoError(t, err)
		return id
	}
	_, err := db.NewRaw(
		"INSERT INTO organization_teams (id, organization_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?)",
		id, orgID, name, "team-"+id, *createdAt,
	).Exec(ctx)
	require.NoError(t, err)
	return id
}

func insertTestOrgMember(ctx context.Context, db bun.IDB, t *testing.T, orgID, userID string) string {
	t.Helper()
	id := uuid.New().String()
	_, err := db.NewRaw(
		"INSERT INTO organization_members (id, organization_id, user_id, role) VALUES (?, ?, ?, ?)",
		id, orgID, userID, "member",
	).Exec(ctx)
	require.NoError(t, err)
	return id
}

func assignTestTeamMember(ctx context.Context, db bun.IDB, t *testing.T, teamID, memberID string) {
	t.Helper()
	_, err := db.NewRaw(
		"INSERT INTO organization_team_members (id, team_id, member_id) VALUES (?, ?, ?)",
		uuid.New().String(), teamID, memberID,
	).Exec(ctx)
	require.NoError(t, err)
}

// createTestOrganization inserts an organization together with the user that owns
// it, since organizations.owner_id is NOT NULL and references users(id).
func createTestOrganization(ctx context.Context, db bun.IDB, t *testing.T) string {
	t.Helper()
	return insertTestOrganizationOwnedBy(ctx, db, t, insertTestUser(ctx, db, t), nil)
}

// createTestOrgTeam returns a team and a user who owns its organization. Callers
// use the user as a guide creator or viewer; also being the org owner is harmless.
func createTestOrgTeam(ctx context.Context, db bun.IDB, t *testing.T) (uuid.UUID, string) {
	t.Helper()
	userID := insertTestUser(ctx, db, t)
	orgID := insertTestOrganizationOwnedBy(ctx, db, t, userID, nil)
	teamID := insertTestTeam(ctx, db, t, orgID, "Test Team", nil)
	return uuid.MustParse(teamID), userID
}
