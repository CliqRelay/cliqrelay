package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func workspacesInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260720000000_workspaces_initial",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE TABLE workspaces (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					organization_id TEXT NOT NULL,
					name VARCHAR(255) NOT NULL,
					type VARCHAR(50) NOT NULL DEFAULT 'PERSONAL',
					owner_id UUID,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT workspaces_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
				);`,
				`CREATE INDEX idx_workspaces_organization_id ON workspaces (organization_id);`,
				`CREATE INDEX idx_workspaces_owner_id ON workspaces (owner_id);`,
				`CREATE INDEX idx_workspaces_type ON workspaces (type);`,
				`DROP TRIGGER IF EXISTS update_workspaces_updated_at_trigger ON workspaces;`,
				`CREATE TRIGGER update_workspaces_updated_at_trigger
					BEFORE UPDATE ON workspaces
					FOR EACH ROW
					EXECUTE FUNCTION set_updated_at_fn();`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS workspaces CASCADE;`,
			)
		},
	}
}
