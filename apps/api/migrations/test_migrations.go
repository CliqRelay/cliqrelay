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
			// Stubs for the Authula-owned tables our queries read from. They carry only
			// the NOT NULL, FOREIGN KEY and UNIQUE constraints — those are what make a
			// fixture impossible in production if violated. Triggers, CHECK constraints,
			// DEFAULT gen_random_uuid() and VARCHAR widths are deliberately omitted:
			// reproducing them here would mean maintaining Authula's DDL by hand.
			`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT, email TEXT, image TEXT, metadata JSONB)`,
			`CREATE TABLE IF NOT EXISTS organizations (
				id UUID PRIMARY KEY,
				owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
			`CREATE TABLE IF NOT EXISTS organization_members (
				id UUID PRIMARY KEY,
				organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
				user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				role TEXT NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT uq_organization_members_organization_user UNIQUE (organization_id, user_id)
			)`,
			`CREATE TABLE IF NOT EXISTS organization_teams (
				id UUID PRIMARY KEY,
				organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
				name TEXT NOT NULL,
				slug TEXT NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
			)`,
			`CREATE TABLE IF NOT EXISTS organization_team_members (
				id UUID PRIMARY KEY,
				team_id UUID NOT NULL REFERENCES organization_teams(id) ON DELETE CASCADE,
				member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT uq_organization_team_members_team_member UNIQUE (team_id, member_id)
			)`,
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
				guidesInitial(),
				stepsInitial(),
				mediaAssetsInitial(),
				starredGuidesInitial(),
				guideViewsInitial(),
			},
		},
	}

	return migrator.Migrate(ctx, migrationSet)
}
