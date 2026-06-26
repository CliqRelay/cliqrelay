package tests

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/CliqRelay/cliqrelay/migrations"
)

func SetupTestSchema(packageName, dsn string) (*bun.DB, func(), error) {
	schemaName := fmt.Sprintf("%s_%d", packageName, time.Now().UnixNano())

	adminDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, nil, fmt.Errorf("admin connect: %w", err)
	}

	_, err = adminDB.Exec(fmt.Sprintf("CREATE SCHEMA %s", pq.QuoteIdentifier(schemaName)))
	if err != nil {
		adminDB.Close()
		return nil, nil, fmt.Errorf("create schema: %w", err)
	}

	schemaDSN := dsn + fmt.Sprintf("&search_path=%s", schemaName)
	sqldb, err := sql.Open("postgres", schemaDSN)
	if err != nil {
		adminDB.Exec(fmt.Sprintf("DROP SCHEMA %s CASCADE", pq.QuoteIdentifier(schemaName)))
		adminDB.Close()
		return nil, nil, fmt.Errorf("schema connect: %w", err)
	}

	db := bun.NewDB(sqldb, pgdialect.New())

	ctx := context.Background()
	if err := migrations.RunTestMigrations(ctx, db); err != nil {
		sqldb.Close()
		adminDB.Exec(fmt.Sprintf("DROP SCHEMA %s CASCADE", pq.QuoteIdentifier(schemaName)))
		adminDB.Close()
		return nil, nil, fmt.Errorf("test migrations: %w", err)
	}

	cleanup := func() {
		sqldb.Close()
		adminDB.Exec(fmt.Sprintf("DROP SCHEMA %s CASCADE", pq.QuoteIdentifier(schemaName)))
		adminDB.Close()
	}

	return db, cleanup, nil
}
