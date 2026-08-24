package migrations

import (
	"context"
	"fmt"
	"log/slog"

	authulamigrations "github.com/Authula/authula/migrations"
	authulamodels "github.com/Authula/authula/models"
	organizationsmigrationset "github.com/Authula/authula/plugins/organizations/migrationset"
	"github.com/uptrace/bun"
)

// testMigrationProvider matches the database the test containers run.
const testMigrationProvider = "postgres"

type testLogger struct{}

func (testLogger) Debug(msg string, args ...any) {}
func (testLogger) Info(msg string, args ...any)  { slog.Debug(msg, args...) }
func (testLogger) Warn(msg string, args ...any)  { slog.Warn(msg, args...) }
func (testLogger) Error(msg string, args ...any) { slog.Error(msg, args...) }

// RunTestMigrations builds the test schema from Authula's own migrations plus this
// app's. Authula owns the users and organization tables, so restating their DDL
// here would mean maintaining a copy that drifts.
func RunTestMigrations(ctx context.Context, db *bun.DB) error {
	coreSet, err := authulamigrations.CoreMigrationSet(testMigrationProvider)
	if err != nil {
		return fmt.Errorf("core migration set: %w", err)
	}

	organizationsSet := authulamigrations.MigrationSet{
		PluginID: authulamodels.PluginOrganizations.String(),
		// The plugin declares a dependency on access control, but none of its DDL
		// references those tables and this app never reads them.
		DependsOn:  []string{authulamigrations.CorePluginID},
		Migrations: organizationsmigrationset.ForProvider(testMigrationProvider),
	}

	// Guides reference organization_teams(id) and users(id).
	cliqrelaySet := authulamigrations.MigrationSet{
		PluginID:  PluginCliqRelay,
		DependsOn: []string{authulamigrations.CorePluginID, authulamodels.PluginOrganizations.String()},
		Migrations: []authulamigrations.Migration{
			guidesInitial(),
			stepsInitial(),
			mediaAssetsInitial(),
			starredGuidesInitial(),
			guideViewsInitial(),
		},
	}

	migrator, err := authulamigrations.NewMigrator(db, testLogger{})
	if err != nil {
		return err
	}

	return migrator.Migrate(ctx, []authulamigrations.MigrationSet{coreSet, organizationsSet, cliqrelaySet})
}
