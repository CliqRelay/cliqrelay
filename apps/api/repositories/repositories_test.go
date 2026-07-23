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

func createTestOrgTeam(ctx context.Context, db *bun.DB, t *testing.T) (uuid.UUID, string) {
	t.Helper()
	orgID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(ctx)
	require.NoError(t, err)
	userID := uuid.New().String()
	_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(ctx)
	require.NoError(t, err)
	teamID := uuid.New()
	_, err = db.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, "Test Team", "test-team").Exec(ctx)
	require.NoError(t, err)
	return teamID, userID
}
