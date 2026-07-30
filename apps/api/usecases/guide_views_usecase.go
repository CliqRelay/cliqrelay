package usecases

import (
	"context"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
)

type GuideViewsUseCase struct {
	authzService      interfaces.AuthorizationService
	guidesService     interfaces.GuidesService
	guideViewsService interfaces.GuideViewsService
}

func NewGuideViewsUseCase(
	authzService interfaces.AuthorizationService,
	guidesService interfaces.GuidesService,
	guideViewsService interfaces.GuideViewsService,
) *GuideViewsUseCase {
	return &GuideViewsUseCase{
		authzService:      authzService,
		guidesService:     guidesService,
		guideViewsService: guideViewsService,
	}
}

func (uc *GuideViewsUseCase) RecordView(ctx context.Context, actor *authulamodels.Actor, guideID uuid.UUID, ipHash, userAgent, viewedAt string) error {
	guide, err := uc.guidesService.GetByID(ctx, guideID.String())
	if err != nil {
		return err
	}

	teamID := guide.TeamID
	if err := uc.authzService.CanReadGuide(ctx, actor, teamID.String(), guide); err != nil {
		return err
	}

	var viewerID *uuid.UUID
	if parsed, err := uuid.Parse(actor.ID); err == nil {
		viewerID = &parsed
	}

	return uc.guideViewsService.RecordView(ctx, teamID, guide, viewerID, ipHash, userAgent, viewedAt)
}

func (uc *GuideViewsUseCase) GetViewCount(ctx context.Context, actor *authulamodels.Actor, teamID uuid.UUID) (int, error) {
	if _, err := uc.authzService.GuideListFilter(ctx, actor, teamID.String()); err != nil {
		return 0, err
	}

	return uc.guideViewsService.GetCountByTeam(ctx, teamID, nil)
}
