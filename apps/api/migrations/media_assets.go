package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func mediaAssetsInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260604000000_media_assets_initial",
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
				`CREATE TABLE media_assets (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					step_id UUID NOT NULL,
					storage_path TEXT NOT NULL,
					mime_type VARCHAR(100),
					alt_text TEXT,
					thumbnail TEXT,
					height INTEGER,
					width INTEGER,
					byte_size INTEGER,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT media_assets_step_id_steps_id_fk FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
					CONSTRAINT media_assets_storage_path_unique UNIQUE(storage_path)
				);`,
				`CREATE INDEX idx_media_assets_step_id ON media_assets (step_id);`,
				`DROP TRIGGER IF EXISTS update_media_assets_updated_at_trigger ON media_assets;`,
				`CREATE TRIGGER update_media_assets_updated_at_trigger
					BEFORE UPDATE ON media_assets
					FOR EACH ROW
					EXECUTE FUNCTION set_updated_at_fn();`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS media_assets CASCADE;`,
			)
		},
	}
}
