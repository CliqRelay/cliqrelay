package migrations

import (
	"context"
	"time"

	"github.com/Authula/authula"
	authulamigrations "github.com/Authula/authula/migrations"
)

const PluginCliqRelay = "cliqrelay"

type Option func(*migrationOptions)

type migrationOptions struct {
	guideViews bool
}

func defaultMigrationOptions() *migrationOptions {
	return &migrationOptions{
		guideViews: true,
	}
}

func (o *migrationOptions) apply(opts ...Option) {
	for _, opt := range opts {
		if opt != nil {
			opt(o)
		}
	}
}

// WithGuideViews controls whether the Postgres guide_views migration runs.
// Disable it when guide views analytics is backed by an alternative store
// (e.g. ClickHouse) instead of Postgres.
func WithGuideViews(enabled bool) Option {
	return func(o *migrationOptions) { o.guideViews = enabled }
}

func RunMigrations(ctx context.Context, auth *authula.Auth, opts ...Option) error {
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	o := defaultMigrationOptions()
	o.apply(opts...)

	migrations := []authulamigrations.Migration{
		guidesInitial(),
		stepsInitial(),
		mediaAssetsInitial(),
		starredGuidesInitial(),
		guideExportsInitial(),
	}
	if o.guideViews {
		migrations = append(migrations, guideViewsInitial())
	}

	migrationSet := []authulamigrations.MigrationSet{
		{
			PluginID:   PluginCliqRelay,
			Migrations: migrations,
		},
	}

	migrator := auth.Migrator()
	return migrator.Migrate(ctx, migrationSet)
}
