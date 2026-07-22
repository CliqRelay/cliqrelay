package migrations

import (
	"context"
	"log/slog"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

type testLogger struct{}

func (testLogger) Debug(msg string, args ...any) {}
func (testLogger) Info(msg string, args ...any)  { slog.Debug(msg, args...) }
func (testLogger) Warn(msg string, args ...any)  { slog.Warn(msg, args...) }
func (testLogger) Error(msg string, args ...any) { slog.Error(msg, args...) }

func RunTestMigrations(ctx context.Context, db *bun.DB) error {
	if err := db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		return authulamigrations.ExecStatements(
			ctx, tx,
			`CREATE EXTENSION IF NOT EXISTS pgcrypto`,
			`CREATE OR REPLACE FUNCTION set_updated_at_fn() RETURNS TRIGGER AS $$
				BEGIN
					NEW.updated_at = NOW();
					RETURN NEW;
				END;
				$$ LANGUAGE plpgsql`,
			`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY)`,
			`CREATE TABLE IF NOT EXISTS organizations (id UUID PRIMARY KEY)`,
		)
	}); err != nil {
		return err
	}

	migrator, err := authulamigrations.NewMigrator(db, testLogger{})
	if err != nil {
		return err
	}

	migrationSet := []authulamigrations.MigrationSet{
		{
			PluginID: PluginCliqRelay,
			Migrations: []authulamigrations.Migration{
				workspacesInitial(),
				guidesInitial(),
				stepsInitial(),
				mediaAssetsInitial(),
				starredGuidesInitial(),
			},
		},
	}

	return migrator.Migrate(ctx, migrationSet)
}
