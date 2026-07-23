package usecases

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

func uuidParse(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

type GuidesUseCase struct {
	authzService   interfaces.AuthorizationService
	guidesService  interfaces.GuidesService
	starredService interfaces.StarredGuidesService
}

func NewGuidesUseCase(
	authzService interfaces.AuthorizationService,
	guidesService interfaces.GuidesService,
	starredSvc interfaces.StarredGuidesService,
) *GuidesUseCase {
	return &GuidesUseCase{
		authzService:   authzService,
		guidesService:  guidesService,
		starredService: starredSvc,
	}
}

func (uc *GuidesUseCase) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateGuideRequest) (*models.Guide, error) {
	teamID := req.TeamID.String()
	if err := uc.authzService.CanCreateGuide(ctx, actor, teamID); err != nil {
		return nil, err
	}

	return uc.guidesService.Create(ctx, actor, teamID, req)
}

func (uc *GuidesUseCase) CreateDemoGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) (string, error) {
	if err := uc.authzService.CanCreateGuide(ctx, actor, teamID); err != nil {
		return "", err
	}

	return uc.guidesService.CreateDemoGuide(ctx, actor, teamID)
}

func (uc *GuidesUseCase) List(ctx context.Context, actor *authulamodels.Actor, teamID string, status *string) ([]*models.Guide, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}

	filter.ViewerUserID = &actor.ID
	parsedTeamID, err := uuidParse(teamID)
	if err != nil {
		return nil, err
	}
	filter.TeamID = &parsedTeamID

	if status != nil {
		statusVal := models.GuideStatus(*status)
		filter.Status = &statusVal
	}

	return uc.guidesService.GetAll(ctx, teamID, status)
}

func (uc *GuidesUseCase) Get(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return guide, nil
}

func (uc *GuidesUseCase) Update(ctx context.Context, actor *authulamodels.Actor, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Update(ctx, guideID, req)
}

func (uc *GuidesUseCase) Delete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanDeleteGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Delete(ctx, guideID)
}

func (uc *GuidesUseCase) GetCount(ctx context.Context, actor *authulamodels.Actor, teamID string) (int, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return 0, err
	}

	parsedTeamID, err := uuidParse(teamID)
	if err != nil {
		return 0, err
	}
	filter.TeamID = &parsedTeamID

	count, err := uc.guidesService.GetCount(ctx, teamID)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (uc *GuidesUseCase) Publish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Publish(ctx, guideID)
}

func (uc *GuidesUseCase) Unpublish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Unpublish(ctx, guideID)
}

func (uc *GuidesUseCase) Archive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Archive(ctx, guideID)
}

func (uc *GuidesUseCase) Unarchive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Unarchive(ctx, guideID)
}

func (uc *GuidesUseCase) Restore(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Restore(ctx, guideID)
}

func (uc *GuidesUseCase) PermanentlyDelete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanDeleteGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.PermanentlyDelete(ctx, guideID)
}

func (uc *GuidesUseCase) RecalculateDuration(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.RecalculateDuration(ctx, guideID)
}

func (uc *GuidesUseCase) Star(ctx context.Context, actor *authulamodels.Actor, guideID string) error {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, teamID, guide); err != nil {
		return err
	}

	return uc.starredService.Star(ctx, guideID)
}

func (uc *GuidesUseCase) Unstar(ctx context.Context, actor *authulamodels.Actor, guideID string) error {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, teamID, guide); err != nil {
		return err
	}

	return uc.starredService.Unstar(ctx, guideID)
}

func (uc *GuidesUseCase) GetStarred(ctx context.Context, actor *authulamodels.Actor, teamID string) ([]*models.Guide, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}

	filter.ViewerUserID = &actor.ID
	parsedTeamID, err := uuidParse(teamID)
	if err != nil {
		return nil, err
	}
	filter.TeamID = &parsedTeamID

	return uc.starredService.GetStarredGuides(ctx)
}
