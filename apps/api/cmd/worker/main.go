package main

import (
	"context"
	"database/sql"
	"log"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/CliqRelay/cliqrelay/bootstrap"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/infra"
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
	defer func() { _ = sqlDB.Close() }()

	db := bun.NewDB(sqlDB, pgdialect.New())

	worker, err := bootstrap.NewWorker(
		bootstrap.WithEnvConfig(envConfig),
		bootstrap.WithInfra(infraCfg),
		bootstrap.WithDB(db),
		bootstrap.WithConsumerGroup("cliqrelay-worker-consumer-group"),
	)
	if err != nil {
		log.Fatal("Error initializing worker: ", err)
	}

	worker.Start(ctx)
	defer worker.Shutdown()

	<-ctx.Done()
}
