package interfaces

import (
	"context"
)

type PurgeService interface {
	PurgeGuide(ctx context.Context, guideID string) error
}
