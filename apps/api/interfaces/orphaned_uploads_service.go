package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/types"
)

type OrphanedUploadsService interface {
	Sweep(ctx context.Context) (*types.OrphanSweepResult, error)
}
