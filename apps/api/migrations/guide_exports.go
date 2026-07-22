package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func guideExportsInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260606000000_guide_exports",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE TABLE guide_exports (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
					guide_id UUID NOT NULL,
					user_id UUID NOT NULL,
					format VARCHAR(255) NOT NULL,
					status VARCHAR(255) NOT NULL DEFAULT 'pending',
					storage_path TEXT,
					error_message TEXT,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT guide_exports_guide_id_fk FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
					CONSTRAINT guide_exports_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
				);`,
				`CREATE INDEX idx_guide_exports_guide_id ON guide_exports (guide_id);`,
				`CREATE INDEX idx_guide_exports_user_id ON guide_exports (user_id);`,
				`CREATE INDEX idx_guide_exports_status ON guide_exports (status);`,
				`DROP TRIGGER IF EXISTS update_guide_exports_updated_at_trigger ON guide_exports;`,
				`CREATE TRIGGER update_guide_exports_updated_at_trigger
					BEFORE UPDATE ON guide_exports
					FOR EACH ROW
					EXECUTE FUNCTION set_updated_at_fn();`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS guide_exports CASCADE;`,
			)
		},
	}
}
