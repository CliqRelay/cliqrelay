package main

import (
	"context"
	"database/sql"
	"log"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/infra"
	bunGuideExports "github.com/CliqRelay/cliqrelay/repositories/guide_exports"
	bunGuides "github.com/CliqRelay/cliqrelay/repositories/guides"
	bunSteps "github.com/CliqRelay/cliqrelay/repositories/steps"
	"github.com/CliqRelay/cliqrelay/services/export"
	"github.com/CliqRelay/cliqrelay/services/presign"
	"github.com/CliqRelay/cliqrelay/services/purge"
	"github.com/CliqRelay/cliqrelay/services/storage"
	"github.com/CliqRelay/cliqrelay/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	envConfig := constants.LoadEnvConfig()

	infraCfg, err := infra.Init(envConfig)
	if err != nil {
		log.Fatal("Error initializing infrastructure: ", err)
	}

	sqlDB, err := sql.Open("postgres", envConfig.DatabaseURL)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}
	defer sqlDB.Close()

	db := bun.NewDB(sqlDB, pgdialect.New())

	guidesRepo := bunGuides.NewBunGuidesRepository(db)
	guideExportsRepo := bunGuideExports.NewBunGuideExportsRepository(db)
	storageService := storage.NewS3StorageService(infraCfg.S3Client)
	presignService := presign.NewAWSPresignService(infraCfg.S3Client, 24*time.Hour)
	purgeService := purge.NewPurgeService(guidesRepo, storageService, infraCfg.S3Bucket)

	stepsRepo := bunSteps.NewBunStepsRepository(db)

	exportService := export.NewExportService(
		guideExportsRepo,
		guidesRepo,
		stepsRepo,
		storageService,
		presignService,
		infraCfg.RedisClient,
		infraCfg.S3Bucket,
	)

	consumer := worker.NewStreamConsumer(infraCfg.RedisClient, "cliqrelay-worker-consumer-group", 5, worker.WithConcurrency(5))
	consumer.RegisterHandler(events.TopicMediaAssets, events.EventTypeMediaAssetDeleted, worker.HandleMediaAssetsEvent(storageService, infraCfg.S3Bucket))
	consumer.RegisterHandler(events.TopicGuides, events.EventTypeGuidePurge, worker.HandleGuidePurgeEvent(purgeService))
	consumer.RegisterHandler(events.TopicGuideExports, events.EventTypeGuideExport, worker.HandleGuideExportEvent(exportService))
	consumer.Start(ctx)

	cronService, err := worker.NewCronService()
	if err != nil {
		log.Fatal("Error creating cron service: ", err)
	}

	if err := worker.RegisterGuidePurgeCron(cronService.Scheduler(), guidesRepo, infraCfg.RedisClient); err != nil {
		log.Fatal("Error registering guide purge cron: ", err)
	}

	cronService.Start()

	<-ctx.Done()
	consumer.Shutdown()
}
