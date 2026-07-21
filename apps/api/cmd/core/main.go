package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"time"

	"github.com/CliqRelay/cliqrelay/auth"
	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/infra"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/migrations"
	"github.com/CliqRelay/cliqrelay/openapi"
	bunGuideExports "github.com/CliqRelay/cliqrelay/repositories/guide_exports"
	bunGuides "github.com/CliqRelay/cliqrelay/repositories/guides"
	bunMediaAssets "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	bunStarredGuides "github.com/CliqRelay/cliqrelay/repositories/starred_guides"
	bunSteps "github.com/CliqRelay/cliqrelay/repositories/steps"
	bunWorkspaces "github.com/CliqRelay/cliqrelay/repositories/workspaces"
	"github.com/CliqRelay/cliqrelay/routes"
	authservice "github.com/CliqRelay/cliqrelay/services/auth"
	"github.com/CliqRelay/cliqrelay/services/export"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	mediaassetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/services/presign"
	"github.com/CliqRelay/cliqrelay/services/purge"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/services/storage"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	workspacesservice "github.com/CliqRelay/cliqrelay/services/workspaces"
	"github.com/CliqRelay/cliqrelay/worker"
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
		envConfig.BaseURL,
		openapi.WithOpenAPIVersion("3.1.0"),
		openapi.WithShortSchemaNames(),
	)
	if err != nil {
		log.Fatal("Error initializing OpenAPI service: ", err)
	}

	authulaAuth := auth.InitAuth(
		envConfig,
	)

	appConfig := &config.AppConfig{
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

	bunWorkspacesRepo := bunWorkspaces.NewBunWorkspacesRepository(appConfig.DB)
	bunGuidesRepo := bunGuides.NewBunGuidesRepository(appConfig.DB)
	bunStarredGuidesRepo := bunStarredGuides.NewBunStarredGuidesRepository(appConfig.DB)
	bunStepsRepo := bunSteps.NewBunStepsRepository(appConfig.DB)
	bunMediaAssetsRepo := bunMediaAssets.NewBunMediaAssetsRepository(appConfig.DB)
	bunGuideExportsRepo := bunGuideExports.NewBunGuideExportsRepository(appConfig.DB)

	guidesCache := guidesservice.NewRedisGuidesCache(appConfig.RedisClient)
	storageService := storage.NewS3StorageService(appConfig.S3Client)
	presignService := presign.NewAWSPresignService(appConfig.S3Client, 24*time.Hour)

	workspaceService := workspacesservice.NewWorkspacesService(bunWorkspacesRepo)
	authorizationService := authservice.NewDefaultAuthorizationService()

	guideHooks := (*interfaces.GuideHooks)(nil)
	stepHooks := (*interfaces.StepHooks)(nil)
	mediaHooks := (*interfaces.MediaAssetHooks)(nil)

	guidesService := guidesservice.NewGuidesService(bunGuidesRepo, bunStarredGuidesRepo, guidesCache, bunStepsRepo, appConfig.RedisClient, authorizationService, guideHooks)
	starredService := starredguidesservice.NewStarredGuidesService(bunStarredGuidesRepo, bunGuidesRepo, authorizationService)
	stepsService := stepsservice.NewStepsService(appConfig.RedisClient, bunStepsRepo, bunGuidesRepo, presignService, storageService, bunMediaAssetsRepo, appConfig.S3Bucket, appConfig.Logger, authorizationService, stepHooks)
	mediaAssetsService := mediaassetsservice.NewMediaAssetsService(bunMediaAssetsRepo, bunStepsRepo, bunGuidesRepo, authorizationService, mediaHooks)
	exportService := export.NewExportService(bunGuideExportsRepo, bunGuidesRepo, bunStepsRepo, storageService, presignService, appConfig.RedisClient, appConfig.S3Bucket)
	uploadsService := uploadsservice.NewUploadsService(bunGuidesRepo, bunStepsRepo, bunMediaAssetsRepo, presignService, authorizationService, appConfig.S3Bucket)
	purgeService := purge.NewPurgeService(bunGuidesRepo, storageService, appConfig.S3Bucket)

	svcs := &interfaces.DomainServices{
		WorkspaceService:     workspaceService,
		GuidesService:        guidesService,
		StepsService:         stepsService,
		StarredGuidesService: starredService,
		MediaAssetsService:   mediaAssetsService,
		ExportService:        exportService,
		UploadsService:       uploadsService,
		PurgeService:         purgeService,
	}

	routes.InitRoutes(appConfig, svcs)

	if envConfig.StandaloneMode == "true" {
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

		if err := worker.RegisterGuidePurgeCron(cronService.Scheduler(), bunGuidesRepo, infraCfg.RedisClient); err != nil {
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
