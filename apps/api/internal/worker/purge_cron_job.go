package worker

import (
	"context"
	"log/slog"

	"github.com/go-co-op/gocron/v2"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/internal/events"
	"github.com/CliqRelay/cliqrelay/internal/interfaces"
)

func RegisterGuidePurgeCron(scheduler gocron.Scheduler, repo interfaces.GuidesRepository, redisClient *redis.Client) error {
	_, err := scheduler.NewJob(
		gocron.CronJob("0 0 * * *", false),
		gocron.NewTask(func() {
			ctx := context.Background()

			ids, err := repo.GetPendingPurge(ctx)
			if err != nil {
				slog.Error("failed to get pending purge guides", "err", err)
				return
			}

			if len(ids) == 0 {
				return
			}

			for _, id := range ids {
				guideID := id.String()
				if err := events.Publish(ctx, redisClient, events.TopicGuides, events.EventTypeGuidePurge, &events.GuidePurgePayload{
					GuideID: guideID,
				}); err != nil {
					slog.Error("failed to publish purge event", "guide_id", guideID, "err", err)
					continue
				}
				slog.Info("queued guide for purge", "guide_id", guideID)
			}
		}),
	)
	return err
}
