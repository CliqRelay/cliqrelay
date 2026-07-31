package interfaces

import (
	"context"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"
)

type GuideViewsUseCase interface {
	RecordView(ctx context.Context, actor *authulamodels.Actor, guideID uuid.UUID, ipHash, userAgent, viewedAt string) error
	GetViewCount(ctx context.Context, actor *authulamodels.Actor, teamID uuid.UUID) (int, error)
}
