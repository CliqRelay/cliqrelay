package worker

import (
	"context"
	"log/slog"

	"github.com/go-co-op/gocron/v2"

	"github.com/CliqRelay/cliqrelay/interfaces"
)

func RegisterExportCleanupCron(scheduler gocron.Scheduler, svc interfaces.ExportCleanupService) error {
	_, err := scheduler.NewJob(
		gocron.CronJob("* * * * *", false),
		gocron.NewTask(func() {
			result, err := svc.Sweep(context.Background())
			if err != nil {
				slog.Error("export cleanup failed", "err", err)
				return
			}
			slog.Debug("export cleanup finished", "scanned", result.Scanned, "skipped", result.Skipped, "deleted", result.Deleted, "rows_deleted", result.RowsDeleted)
		}),
	)
	return err
}
