package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"time"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/auth"
	"github.com/CliqRelay/cliqrelay/internal/constants"
	"github.com/CliqRelay/cliqrelay/internal/events"
	"github.com/CliqRelay/cliqrelay/internal/infra"
	"github.com/CliqRelay/cliqrelay/internal/migrations"
	"github.com/CliqRelay/cliqrelay/internal/openapi"
	bunGuideExports "github.com/CliqRelay/cliqrelay/internal/repositories/guide_exports"
	bunGuides "github.com/CliqRelay/cliqrelay/internal/repositories/guides"
	bunSteps "github.com/CliqRelay/cliqrelay/internal/repositories/steps"
	"github.com/CliqRelay/cliqrelay/internal/routes"
	"github.com/CliqRelay/cliqrelay/internal/services/export"
	"github.com/CliqRelay/cliqrelay/internal/services/presign"
	"github.com/CliqRelay/cliqrelay/internal/services/purge"
	"github.com/CliqRelay/cliqrelay/internal/services/storage"
	"github.com/CliqRelay/cliqrelay/internal/worker"
)

func main() {
	envConfig := constants.LoadEnvConfig()

	infraCfg, err := infra.Init(envConfig)
	if err != nil {
		log.Fatal("Error initializing infrastructure: ", err)
	}

	openAPISvc, err := openapi.NewOpenAPIService(
		"CliqRelay API",
		envConfig.OpenAPISpecVersion,
		"CliqRelay API - open-source platform that transforms page clicks and interactions into beautiful, step-by-step visual documentation.",
		"http://localhost:8080",
		openapi.WithOpenAPIVersion("3.1.0"),
		openapi.WithShortSchemaNames(),
	)
	if err != nil {
		log.Fatal("Error initializing OpenAPI service: ", err)
	}

	authulaAuth := auth.InitAuth(
		envConfig,
		auth.AuthInitConfig{},
	)

	appConfig := &internal.AppConfig{
		EnvConfig:       envConfig,
		DB:              authulaAuth.DB(),
		RedisClient:     infraCfg.RedisClient,
		AuthulaInstance: authulaAuth,
		Logger:          infraCfg.Logger,
		OpenAPIService:  openAPISvc,
		BasePath:        "/api/v1",
		S3Client:        infraCfg.S3Client,
		S3Bucket:        infraCfg.S3Bucket,
	}

	if err := migrations.RunMigrations(appConfig); err != nil {
		log.Fatal("Error initializing migrations: ", err)
	}

	routes.InitRoutes(appConfig)

	if envConfig.StandaloneMode == "true" {
		storageService := storage.NewS3StorageService(infraCfg.S3Client)
		guidesRepo := bunGuides.NewBunGuidesRepository(appConfig.DB)
		stepsRepo := bunSteps.NewBunStepsRepository(appConfig.DB)
		guideExportsRepo := bunGuideExports.NewBunGuideExportsRepository(appConfig.DB)
		presignService := presign.NewAWSPresignService(infraCfg.S3Client, 24*time.Hour)
		purgeService := purge.NewPurgeService(guidesRepo, storageService, infraCfg.S3Bucket)

		exportService := export.NewExportService(
			guideExportsRepo,
			guidesRepo,
			stepsRepo,
			storageService,
			presignService,
			infraCfg.RedisClient,
			infraCfg.S3Bucket,
		)

		consumer := worker.NewStreamConsumer(infraCfg.RedisClient, "cliqrelay-standalone-consumer-group", 5, worker.WithConcurrency(5))
		consumer.RegisterHandler(events.TopicMediaAssets, events.EventTypeMediaAssetDeleted, worker.HandleMediaAssetsEvent(storageService, infraCfg.S3Bucket))
		consumer.RegisterHandler(events.TopicGuides, events.EventTypeGuidePurge, worker.HandleGuidePurgeEvent(purgeService))
		consumer.RegisterHandler(events.TopicGuideExports, events.EventTypeGuideExport, worker.HandleGuideExportEvent(exportService))

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		consumer.Start(ctx)
		defer consumer.Shutdown()

		cronService, err := worker.NewCronService()
		if err != nil {
			log.Fatal("Error creating cron service: ", err)
		}

		if err := worker.RegisterGuidePurgeCron(cronService.Scheduler(), guidesRepo, infraCfg.RedisClient); err != nil {
			log.Fatal("Error registering guide purge cron: ", err)
		}

		cronService.Start()
	}

	port := envConfig.Port
	slog.Debug(fmt.Sprintf("Server running on http://localhost:%s", port))
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), appConfig.AuthulaInstance.Handler()); err != nil {
		slog.Error("Server error", "err", err)
	}
}
