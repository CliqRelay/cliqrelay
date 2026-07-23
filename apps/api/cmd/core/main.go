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
	"github.com/CliqRelay/cliqrelay/usecases"
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

	var workspaceService interfaces.WorkspaceService

	authServiceHooks := auth.InitAuthServiceHooks(func() interfaces.WorkspaceService {
		return workspaceService
	})
	authulaAuth := auth.InitAuth(
		envConfig,
		authServiceHooks,
	)

	// organizationsPlugin := authulaAuth.PluginRegistry.GetPlugin("organizations").(*organizations.OrganizationsPlugin)
	// accessControlPlugin := authulaAuth.PluginRegistry.GetPlugin("access_control").(*accesscontrol.AccessControlPlugin)

	// authulaAuth.RegisterHook(authulamodels.Hook{
	// 	Stage: authulamodels.HookAfter,
	// 	Matcher: func(reqCtx *authulamodels.RequestContext) bool {
	// 		return reqCtx.Route != nil &&
	// 			reqCtx.Route.Method == "POST" &&
	// 			strings.HasSuffix(reqCtx.Route.Pattern, "/email-password/sign-up") &&
	// 			reqCtx.Actor != nil &&
	// 			reqCtx.Actor.ID != ""
	// 	},
	// 	Handler: func(reqCtx *authulamodels.RequestContext) error {
	// 		actor := reqCtx.Actor
	// 		if actor == nil {
	// 			return nil
	// 		}

	// 		ctx := reqCtx.Request.Context()
	// 		orgName := "Personal"
	// 		if email, ok := actor.Claims["email"].(string); ok && email != "" {
	// 			orgName = email
	// 		}

	// 		org, err := orgPlugin.Api.CreateOrganization(ctx, actor, organizationstypes.CreateOrganizationRequest{
	// 			Name: orgName,
	// 			Role: "admin",
	// 		})
	// 		if err != nil {
	// 			slog.Error("Failed to create organization after signup", "user_id", actor.ID, "err", err)
	// 			return nil
	// 		}

	// 		adminRole, err := acPlugin.Api.GetRoleByName(ctx, actor, "admin")
	// 		if err != nil || adminRole == nil {
	// 			adminRole, err = acPlugin.Api.CreateRole(ctx, actor, accesscontroltypes.CreateRoleRequest{
	// 				Name:        "admin",
	// 				Description: new("Administrator with full access"),
	// 				IsSystem:    true,
	// 			})
	// 			if err != nil {
	// 				slog.Error("Failed to create admin role after signup", "err", err)
	// 				return nil
	// 			}
	// 		}

	// 		err = acPlugin.Api.AssignRoleToUser(ctx, actor, actor.ID, accesscontroltypes.AssignUserRoleRequest{
	// 			RoleID: adminRole.ID,
	// 		}, nil)
	// 		if err != nil {
	// 			slog.Error("Failed to assign admin role after signup", "user_id", actor.ID, "err", err)
	// 		}

	// 		_, err = bunWorkspaces.NewBunWorkspacesRepository(authulaAuth.DB()).Create(ctx, &types.CreateWorkspaceDTO{
	// 			OrganizationID: org.ID,
	// 			OwnerID:        actor.ID,
	// 			Name:           "My Workspace",
	// 			Type:           models.WorkspaceTypePersonal,
	// 		})
	// 		if err != nil {
	// 			slog.Error("Failed to create workspace after signup", "user_id", actor.ID, "err", err)
	// 		}

	// 		return nil
	// 	},
	// 	Async: true,
	// 	Order: 0,
	// })

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

	if err := auth.SeedOrganizationRoles(context.Background(), appConfig.AuthulaInstance); err != nil {
		log.Fatal("Error seeding organization roles: ", err)
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

	workspaceService = workspacesservice.NewWorkspacesService(bunWorkspacesRepo)
	authorizationService := authservice.NewDefaultAuthorizationService()

	guideHooks := (*interfaces.GuideHooks)(nil)
	stepHooks := (*interfaces.StepHooks)(nil)
	mediaHooks := (*interfaces.MediaAssetHooks)(nil)

	guidesService := guidesservice.NewGuidesService(bunGuidesRepo, bunStarredGuidesRepo, guidesCache, bunStepsRepo, appConfig.RedisClient, guideHooks)
	starredService := starredguidesservice.NewStarredGuidesService(bunStarredGuidesRepo, bunGuidesRepo)
	stepsService := stepsservice.NewStepsService(appConfig.RedisClient, bunStepsRepo, bunGuidesRepo, presignService, storageService, bunMediaAssetsRepo, appConfig.S3Bucket, appConfig.Logger, stepHooks)
	mediaAssetsService := mediaassetsservice.NewMediaAssetsService(bunMediaAssetsRepo, bunStepsRepo, bunGuidesRepo, mediaHooks)
	exportService := export.NewExportService(bunGuideExportsRepo, bunGuidesRepo, bunStepsRepo, storageService, presignService, appConfig.RedisClient, appConfig.S3Bucket)
	uploadsService := uploadsservice.NewUploadsService(bunGuidesRepo, bunStepsRepo, bunMediaAssetsRepo, presignService, appConfig.S3Bucket)
	purgeService := purge.NewPurgeService(bunGuidesRepo, storageService, appConfig.S3Bucket)

	guidesUseCase := usecases.NewGuidesUseCase(authorizationService, guidesService, starredService)
	stepsUseCase := usecases.NewStepsUseCase(authorizationService, stepsService, guidesService)
	mediaAssetsUseCase := usecases.NewMediaAssetsUseCase(authorizationService, mediaAssetsService, stepsService, guidesService)
	uploadsUseCase := usecases.NewUploadsUseCase(authorizationService, uploadsService, guidesService, stepsService)

	svcs := &interfaces.DomainUseCases{
		WorkspaceService:   workspaceService,
		GuidesUseCase:      guidesUseCase,
		StepsUseCase:       stepsUseCase,
		MediaAssetsUseCase: mediaAssetsUseCase,
		ExportService:      exportService,
		UploadsUseCase:     uploadsUseCase,
		PurgeService:       purgeService,
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
