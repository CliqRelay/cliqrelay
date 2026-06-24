package migrations

import (
	"context"
	"time"

	authulamigrations "github.com/Authula/authula/migrations"

	"github.com/CliqRelay/cliqrelay/internal"
)

const PluginCliqRelay = "cliqrelay"

func RunMigrations(appConfig *internal.AppConfig) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	migrator := appConfig.AuthulaInstance.Migrator()
	migrationSet := []authulamigrations.MigrationSet{
		{
			PluginID: PluginCliqRelay,
			Migrations: []authulamigrations.Migration{
				guidesPostgresInitial(),
				stepsPostgresInitial(),
				mediaAssetsPostgresInitial(),
				starredGuidesPostgresInitial(),
				guideExportsPostgresInitial(),
			},
		},
	}

	return migrator.Migrate(ctx, migrationSet)
}
