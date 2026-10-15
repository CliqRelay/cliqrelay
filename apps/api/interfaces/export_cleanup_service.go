package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/types"
)

type ExportCleanupService interface {
	Sweep(ctx context.Context) (*types.ExportCleanupResult, error)
}
