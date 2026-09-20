package dbutil

import (
	"context"
	"database/sql"
)

type execer interface {
	Exec(ctx context.Context, dest ...any) (sql.Result, error)
}

// Runs a single-row RETURNING * statement; bun leaves the model zeroed rather than
// returning sql.ErrNoRows when nothing matched, so the row count decides not-found.
func ExecReturningOne[T any](ctx context.Context, query execer, model *T) (*T, error) {
	res, err := query.Exec(ctx)
	if err != nil {
		return nil, err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, nil
	}

	return model, nil
}
