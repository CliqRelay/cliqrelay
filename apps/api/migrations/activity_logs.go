package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func activityLogsInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260923000000_activity_logs_initial",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE TABLE activity_logs (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
					team_id UUID REFERENCES organization_teams(id) ON DELETE CASCADE,
					actor_id TEXT NOT NULL,
					actor_type VARCHAR(32) NOT NULL,
					event_type VARCHAR(100) NOT NULL,
					target_id TEXT NOT NULL,
					target_type VARCHAR(50) NOT NULL,
					metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
					created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
				);`,
				`CREATE INDEX idx_activity_logs_team_created ON activity_logs(team_id, created_at DESC);`,
				`CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);`,
				`CREATE INDEX idx_activity_logs_actor_type ON activity_logs(actor_type);`,
				`CREATE INDEX idx_activity_logs_target ON activity_logs(target_type, target_id);`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS activity_logs CASCADE;`,
			)
		},
	}
}
