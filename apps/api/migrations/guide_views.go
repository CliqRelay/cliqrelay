package migrations

import (
	"context"

	authulamigrations "github.com/Authula/authula/migrations"
	"github.com/uptrace/bun"
)

func guideViewsInitial() authulamigrations.Migration {
	return authulamigrations.Migration{
		Version: "20260607000000_guide_views_initial",
		Up: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`CREATE TABLE guide_views (
					id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
					team_id UUID NOT NULL REFERENCES organization_teams(id) ON DELETE CASCADE,
					guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
					viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
					ip_hash TEXT,
					user_agent TEXT,
					duration_seconds INT NOT NULL DEFAULT 0,
					viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
				);`,
				`CREATE INDEX idx_guide_views_team_analytics ON guide_views(team_id, viewed_at DESC);`,
				`CREATE INDEX idx_guide_views_dedupe_user ON guide_views(guide_id, viewer_id, viewed_at DESC) WHERE viewer_id IS NOT NULL;`,
				`CREATE INDEX idx_guide_views_dedupe_ip ON guide_views(guide_id, ip_hash, viewed_at DESC) WHERE viewer_id IS NULL;`,
			)
		},
		Down: func(ctx context.Context, tx bun.Tx) error {
			return authulamigrations.ExecStatements(
				ctx,
				tx,
				`DROP TABLE IF EXISTS guide_views CASCADE;`,
			)
		},
	}
}
