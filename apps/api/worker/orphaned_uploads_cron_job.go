package worker

import (
	"context"
	"log/slog"

	"github.com/go-co-op/gocron/v2"

	"github.com/CliqRelay/cliqrelay/interfaces"
)

func RegisterOrphanedUploadsSweepCron(scheduler gocron.Scheduler, svc interfaces.OrphanedUploadsService) error {
	_, err := scheduler.NewJob(
		gocron.CronJob("0 1 * * *", false),
		gocron.NewTask(func() {
			result, err := svc.Sweep(context.Background())
			if err != nil {
				slog.Error("orphaned uploads sweep failed", "err", err)
				return
			}
			slog.Info("orphaned uploads sweep finished", "scanned", result.Scanned, "skipped", result.Skipped, "deleted", result.Deleted)
		}),
	)
	return err
}
