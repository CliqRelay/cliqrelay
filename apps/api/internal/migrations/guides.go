package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func guidesPostgresInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260605000000_guides_initial",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
				`CREATE OR REPLACE FUNCTION set_updated_at_fn() RETURNS TRIGGER AS $$
					BEGIN
						NEW.updated_at = NOW();
						RETURN NEW;
					END;
					$$ LANGUAGE plpgsql;`,
				`CREATE TABLE guides (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
					title VARCHAR(255) NOT NULL,
					description TEXT,
					status VARCHAR(255) NOT NULL DEFAULT 'draft',
					duration_seconds INT NOT NULL DEFAULT 0,
					published_at TIMESTAMP WITH TIME ZONE,
					archived_at TIMESTAMP WITH TIME ZONE,
					deleted_at TIMESTAMP WITH TIME ZONE,
					restored_at TIMESTAMP WITH TIME ZONE,
					purge_requested_at TIMESTAMP WITH TIME ZONE,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
				);`,
				`CREATE INDEX idx_guides_creator_id ON guides (creator_id);`,
				`CREATE INDEX idx_guides_status ON guides (status);`,
				`CREATE INDEX idx_guides_deleted_at ON guides (deleted_at);`,
				`CREATE INDEX idx_guides_purge_requested_at ON guides (purge_requested_at);`,
				`DROP TRIGGER IF EXISTS update_guides_updated_at_trigger ON guides;`,
				`CREATE TRIGGER update_guides_updated_at_trigger
					BEFORE UPDATE ON guides
					FOR EACH ROW
					EXECUTE FUNCTION set_updated_at_fn();`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS guides CASCADE;`,
			)
		},
	}
}
