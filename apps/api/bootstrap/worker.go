package bootstrap

import (
	"context"
	"errors"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/worker"
)

type Worker struct {
	consumer *worker.StreamConsumer
	cron     *worker.CronService
	cancel   context.CancelFunc
}

func NewWorker(opts ...Option) (*Worker, error) {
	o := defaultOptions()
	o.apply(opts...)

	if o.infraCfg == nil {
		return nil, errors.New("bootstrap: WithInfra is required")
	}

	repos, err := buildRepositories(o)
	if err != nil {
		return nil, err
	}

	svcs := buildServices(o, repos)

	consumer := worker.NewStreamConsumer(o.infraCfg.RedisClient, o.consumerGroup, 5, worker.WithConcurrency(o.concurrency))
	consumer.RegisterHandler(events.TopicMediaAssets, events.EventTypeMediaAssetDeleted, worker.HandleMediaAssetsEvent(svcs.Storage, o.infraCfg.S3Bucket))
	consumer.RegisterHandler(events.TopicGuides, events.EventTypeGuidePurge, worker.HandleGuidePurgeEvent(svcs.Domain.PurgeService))
	consumer.RegisterHandler(events.TopicGuideExports, events.EventTypeGuideExport, worker.HandleGuideExportEvent(svcs.Domain.ExportService))

	w := &Worker{consumer: consumer}

	if o.enableCron {
		cronService, err := worker.NewCronService()
		if err != nil {
			return nil, err
		}
		if err := worker.RegisterGuidePurgeCron(cronService.Scheduler(), repos.Guides, o.infraCfg.RedisClient); err != nil {
			return nil, err
		}
		w.cron = cronService
	}

	return w, nil
}

func (w *Worker) Start(ctx context.Context) {
	ctx, w.cancel = context.WithCancel(ctx)
	w.consumer.Start(ctx)
	if w.cron != nil {
		w.cron.Start()
	}
}

func (w *Worker) Shutdown() {
	if w.cancel != nil {
		w.cancel()
	}
	w.consumer.Shutdown()
	if w.cron != nil {
		_ = w.cron.Shutdown()
	}
}
