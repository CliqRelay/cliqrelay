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
	authzService  interfaces.AuthorizationService
	guidesService interfaces.GuidesService
	starredSvc    interfaces.StarredGuidesService
}

func NewGuidesUseCase(
	authzService interfaces.AuthorizationService,
	guidesService interfaces.GuidesService,
	starredSvc interfaces.StarredGuidesService,
) *GuidesUseCase {
	return &GuidesUseCase{
		authzService:  authzService,
		guidesService: guidesService,
		starredSvc:    starredSvc,
	}
}

func (uc *GuidesUseCase) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateGuideRequest) (*models.Guide, error) {
	workspaceID := req.WorkspaceID.String()
	if err := uc.authzService.CanCreateGuide(ctx, actor, workspaceID); err != nil {
		return nil, err
	}

	return uc.guidesService.Create(ctx, workspaceID, req)
}

func (uc *GuidesUseCase) CreateDemoGuide(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (string, error) {
	if err := uc.authzService.CanCreateGuide(ctx, actor, workspaceID); err != nil {
		return "", err
	}

	return uc.guidesService.CreateDemoGuide(ctx, workspaceID)
}

func (uc *GuidesUseCase) List(ctx context.Context, actor *authulamodels.Actor, workspaceID string, status *string) ([]*models.Guide, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, workspaceID)
	if err != nil {
		return nil, err
	}

	filter.ViewerUserID = &actor.ID
	parsedWSID, err := uuidParse(workspaceID)
	if err != nil {
		return nil, err
	}
	filter.WorkspaceID = &parsedWSID

	if status != nil {
		statusVal := models.GuideStatus(*status)
		filter.Status = &statusVal
	}

	return uc.guidesService.GetAll(ctx, workspaceID, status)
}

func (uc *GuidesUseCase) Get(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return guide, nil
}

func (uc *GuidesUseCase) Update(ctx context.Context, actor *authulamodels.Actor, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Update(ctx, guideID, req)
}

func (uc *GuidesUseCase) Delete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanDeleteGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Delete(ctx, guideID)
}

func (uc *GuidesUseCase) GetCount(ctx context.Context, actor *authulamodels.Actor, workspaceID string) (int, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, workspaceID)
	if err != nil {
		return 0, err
	}

	parsedWSID, err := uuidParse(workspaceID)
	if err != nil {
		return 0, err
	}
	filter.WorkspaceID = &parsedWSID

	count, err := uc.guidesService.GetCount(ctx, workspaceID)
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

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Publish(ctx, guideID)
}

func (uc *GuidesUseCase) Unpublish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Unpublish(ctx, guideID)
}

func (uc *GuidesUseCase) Archive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Archive(ctx, guideID)
}

func (uc *GuidesUseCase) Unarchive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Unarchive(ctx, guideID)
}

func (uc *GuidesUseCase) Restore(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.Restore(ctx, guideID)
}

func (uc *GuidesUseCase) PermanentlyDelete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanDeleteGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.PermanentlyDelete(ctx, guideID)
}

func (uc *GuidesUseCase) RecalculateDuration(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.RecalculateDuration(ctx, guideID)
}

func (uc *GuidesUseCase) Star(ctx context.Context, actor *authulamodels.Actor, guideID string) error {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return err
	}

	return uc.starredSvc.Star(ctx, guideID)
}

func (uc *GuidesUseCase) Unstar(ctx context.Context, actor *authulamodels.Actor, guideID string) error {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return err
	}

	return uc.starredSvc.Unstar(ctx, guideID)
}

func (uc *GuidesUseCase) GetStarred(ctx context.Context, actor *authulamodels.Actor, workspaceID string) ([]*models.Guide, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, workspaceID)
	if err != nil {
		return nil, err
	}

	filter.ViewerUserID = &actor.ID
	parsedWSID, err := uuidParse(workspaceID)
	if err != nil {
		return nil, err
	}
	filter.WorkspaceID = &parsedWSID

	return uc.starredSvc.GetStarredGuides(ctx, workspaceID)
}
