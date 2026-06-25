package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func stepsPostgresInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260605000001_steps_initial",
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
				`CREATE TABLE steps (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					guide_id UUID NOT NULL,
					type VARCHAR(255) NOT NULL,
					sort_order TEXT NOT NULL COLLATE "C",
					action VARCHAR(255),
					action_text TEXT,
					url TEXT,
					notes TEXT,
					target_element JSONB,
					canvas_content JSONB,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT steps_guide_id_guides_id_fk FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
				);`,
				`CREATE INDEX idx_steps_guide_sort_order ON steps (guide_id, sort_order);`,
				`CREATE INDEX idx_steps_guide_id ON steps (guide_id);`,
				`CREATE INDEX idx_steps_action ON steps (action);`,
				`CREATE INDEX idx_steps_canvas_content ON steps USING gin (canvas_content);`,
				`DROP TRIGGER IF EXISTS update_steps_updated_at_trigger ON steps;`,
				`CREATE TRIGGER update_steps_updated_at_trigger
					BEFORE UPDATE ON steps
					FOR EACH ROW
					EXECUTE FUNCTION set_updated_at_fn();`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS steps CASCADE;`,
			)
		},
	}
}
