package repositories_test

import (
	"context"
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
		guidesDB.Close()
	})

	stepsDB, _, err = tests.SetupTestSchema("steps", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		stepsDB.Close()
	})

	mediaAssetsDB, _, err = tests.SetupTestSchema("media_assets", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		mediaAssetsDB.Close()
	})

	guideViewsDB, _, err = tests.SetupTestSchema("guide_views", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		guideViewsDB.Close()
	})

	teamsDB, _, err = tests.SetupTestSchema("teams", dsn)
	if err != nil {
		runCleanups(cleanups)
		cleanupContainer()
		os.Exit(1)
	}
	cleanups = append(cleanups, func() {
		teamsDB.Close()
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

// createTestOrganization inserts an organization together with the user that owns
// it, since organizations.owner_id is NOT NULL and references users(id).
func createTestOrganization(ctx context.Context, db bun.IDB, t *testing.T) string {
	t.Helper()
	ownerID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", ownerID).Exec(ctx)
	require.NoError(t, err)
	orgID := uuid.New().String()
	_, err = db.NewRaw("INSERT INTO organizations (id, owner_id) VALUES (?, ?)", orgID, ownerID).Exec(ctx)
	require.NoError(t, err)
	return orgID
}

func createTestOrgTeam(ctx context.Context, db bun.IDB, t *testing.T) (uuid.UUID, string) {
	t.Helper()
	// organizations.owner_id is NOT NULL and references users(id), so the user has
	// to exist before the organization. The returned user is also the org owner;
	// callers only use it as a guide creator/viewer, so that is harmless.
	userID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(ctx)
	require.NoError(t, err)
	orgID := uuid.New().String()
	_, err = db.NewRaw("INSERT INTO organizations (id, owner_id) VALUES (?, ?)", orgID, userID).Exec(ctx)
	require.NoError(t, err)
	teamID := uuid.New()
	_, err = db.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, "Test Team", "test-team").Exec(ctx)
	require.NoError(t, err)
	return teamID, userID
}
