package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuideHooks struct {
	BeforeCreate    func(ctx context.Context, actor *authulamodels.Actor, req *types.CreateGuideRequest) error
	AfterCreate     func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	BeforeUpdate    func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	AfterUpdate     func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	BeforeDelete    func(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	AfterDelete     func(ctx context.Context, actor *authulamodels.Actor, guideID string) error
	BeforePublish   func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	AfterPublish    func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	BeforeArchive   func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	AfterArchive    func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	BeforeUnarchive func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	AfterUnarchive  func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	BeforeUnpublish func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
	AfterUnpublish  func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error
}
