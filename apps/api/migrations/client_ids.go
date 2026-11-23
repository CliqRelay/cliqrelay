package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func clientIDsInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20261123000000_client_ids_initial",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`ALTER TABLE guides ADD COLUMN client_guide_id UUID;`,
				`ALTER TABLE steps ADD COLUMN client_step_id UUID;`,
				`CREATE UNIQUE INDEX idx_guides_creator_client_guide_id
					ON guides (creator_id, client_guide_id)
					WHERE client_guide_id IS NOT NULL;`,
				`CREATE UNIQUE INDEX idx_steps_guide_client_step_id
					ON steps (guide_id, client_step_id)
					WHERE client_step_id IS NOT NULL;`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP INDEX IF EXISTS idx_steps_guide_client_step_id;`,
				`DROP INDEX IF EXISTS idx_guides_creator_client_guide_id;`,
				`ALTER TABLE steps DROP COLUMN IF EXISTS client_step_id;`,
				`ALTER TABLE guides DROP COLUMN IF EXISTS client_guide_id;`,
			)
		},
	}
}
