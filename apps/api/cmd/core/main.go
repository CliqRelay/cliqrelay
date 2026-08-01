package main

import (
	"context"
	"log"
	"log/slog"

	"github.com/Authula/authula"

	"github.com/CliqRelay/cliqrelay/auth"
	"github.com/CliqRelay/cliqrelay/bootstrap"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/infra"
	"github.com/CliqRelay/cliqrelay/openapi"
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

	var authulaAuth *authula.Auth
	authulaAuth = auth.InitAuth(
		envConfig,
		auth.InitAuthServiceHooks(func() *authula.Auth { return authulaAuth }),
	)

	app, err := bootstrap.New(
		bootstrap.WithEnvConfig(envConfig),
		bootstrap.WithAuthula(authulaAuth),
		bootstrap.WithInfra(infraCfg),
		bootstrap.WithOpenAPIService(openAPISvc),
		bootstrap.WithBasePath("/api/v1"),
	)
	if err != nil {
		log.Fatal("Error initializing application: ", err)
	}

	if err := app.Migrate(context.Background()); err != nil {
		log.Fatal("Error initializing migrations: ", err)
	}

	if err := auth.SeedRolesAndPermissions(context.Background(), authulaAuth); err != nil {
		log.Fatal("Error seeding roles and permissions: ", err)
	}

	if envConfig.StandaloneMode == "true" {
		worker, err := bootstrap.NewWorker(
			bootstrap.WithEnvConfig(envConfig),
			bootstrap.WithInfra(infraCfg),
			bootstrap.WithDB(authulaAuth.DB()),
			bootstrap.WithConsumerGroup("cliqrelay-standalone-consumer-group"),
		)
		if err != nil {
			log.Fatal("Error initializing standalone worker: ", err)
		}
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		worker.Start(ctx)
		defer worker.Shutdown()
	}

	if err := app.Run(); err != nil {
		slog.Error("Server error", "err", err)
	}
}
