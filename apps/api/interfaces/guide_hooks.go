package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type GuideHooks struct {
	BeforeCreate    []func(ctx context.Context, guide *models.Guide, userID string) error
	AfterCreate     []func(ctx context.Context, guide *models.Guide, userID string) error
	BeforeUpdate    []func(ctx context.Context, guide *models.Guide, userID string) error
	AfterUpdate     []func(ctx context.Context, guide *models.Guide, userID string) error
	BeforeDelete    []func(ctx context.Context, guideID string, userID string) error
	AfterDelete     []func(ctx context.Context, guideID string, userID string) error
	BeforePublish   []func(ctx context.Context, guide *models.Guide, userID string) error
	AfterPublish    []func(ctx context.Context, guide *models.Guide, userID string) error
	BeforeArchive   []func(ctx context.Context, guide *models.Guide, userID string) error
	AfterArchive    []func(ctx context.Context, guide *models.Guide, userID string) error
	BeforeUnpublish []func(ctx context.Context, guide *models.Guide, userID string) error
	AfterUnpublish  []func(ctx context.Context, guide *models.Guide, userID string) error
}
