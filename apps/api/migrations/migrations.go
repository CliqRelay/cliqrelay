package migrations

import (
	"context"
	"time"

	"github.com/Authula/authula"
	authulamigrations "github.com/Authula/authula/migrations"
)

const PluginCliqRelay = "cliqrelay"

type Option func(*migrationOptions)

type migrationOptions struct{}

func defaultMigrationOptions() *migrationOptions {
	return &migrationOptions{}
}

func (o *migrationOptions) apply(opts ...Option) {
	for _, opt := range opts {
		if opt != nil {
			opt(o)
		}
	}
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

	migrationSet := []authulamigrations.MigrationSet{
		{
			PluginID:   PluginCliqRelay,
			Migrations: migrations,
		},
	}

	migrator := auth.Migrator()
	return migrator.Migrate(ctx, migrationSet)
}
