package tests

import (
	"context"
	"fmt"
	"os"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

func StartPostgresContainer(ctx context.Context) (dsn string, cleanup func(), err error) {
	if dsn := os.Getenv("TEST_DATABASE_URL"); dsn != "" {
		return dsn, func() {}, nil
	}

	pgContainer, err := postgres.Run(ctx,
		"postgres:18-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return "", nil, fmt.Errorf("start postgres container: %w", err)
	}

	dsn, err = pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		testcontainers.TerminateContainer(pgContainer)
		return "", nil, fmt.Errorf("get connection string: %w", err)
	}

	cleanup = func() {
		testcontainers.TerminateContainer(pgContainer)
	}

	return dsn, cleanup, nil
}
