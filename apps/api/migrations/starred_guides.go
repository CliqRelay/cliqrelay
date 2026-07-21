package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func starredGuidesPostgresInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260610000000_starred_guides",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE TABLE starred_guides (
					user_id UUID NOT NULL,
					guide_id UUID NOT NULL,
					workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					PRIMARY KEY (user_id, guide_id),
					CONSTRAINT starred_guides_guide_id_fk FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
					CONSTRAINT starred_guides_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
				);`,
				`CREATE INDEX idx_starred_guides_user_id ON starred_guides(user_id);`,
				`CREATE INDEX idx_starred_guides_guide_id ON starred_guides(guide_id);`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS starred_guides CASCADE;`,
			)
		},
	}
}
