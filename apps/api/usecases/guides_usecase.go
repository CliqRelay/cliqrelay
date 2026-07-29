package usecases

import (
	"context"
	"fmt"
	"slices"

	authulamodels "github.com/Authula/authula/models"
	orgconstants "github.com/Authula/authula/plugins/organizations/constants"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
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

func (uc *GuidesUseCase) List(ctx context.Context, actor *authulamodels.Actor, teamID string, status *string, excludeArchived bool, page, limit int, sortBy, sortDir string) ([]*models.Guide, int, error) {
	if _, err := uc.authzService.GuideListFilter(ctx, actor, teamID); err != nil {
		return nil, 0, err
	}
	return uc.guidesService.GetAll(ctx, teamID, status, &actor.ID, excludeArchived, page, limit, sortBy, sortDir)
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

	starred, err := uc.starredService.IsStarred(ctx, guideID, actor.ID)
	if err == nil {
		guide.IsStarred = starred
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

	if req.Visibility != nil && *req.Visibility == models.VisibilityPrivate && guide.CreatorID != actor.ID {
		return nil, constants.ErrCannotSetGuideToPrivate
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
	_, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return 0, err
	}

	count, err := uc.guidesService.GetCount(ctx, teamID, &actor.ID)
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
	guide, err := uc.guidesService.GetByIDUnfiltered(ctx, guideID)
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
	guide, err := uc.guidesService.GetByIDUnfiltered(ctx, guideID)
	if err != nil {
		return nil, err
	}

	teamID := guide.TeamID.String()
	if err := uc.authzService.CanDeleteGuide(ctx, actor, teamID, guide); err != nil {
		return nil, err
	}

	return uc.guidesService.PermanentlyDelete(ctx, guideID)
}

func (uc *GuidesUseCase) BulkAction(ctx context.Context, actor *authulamodels.Actor, action string, req *types.BulkGuidesRequest) error {
	if _, err := uc.authzService.GuideListFilter(ctx, actor, req.TeamID); err != nil {
		return err
	}

	isAdmin := slices.Contains(actor.Scopes, orgconstants.All)

	var err error
	switch action {
	case "delete":
		_, err = uc.guidesService.BulkDelete(ctx, req.IDs, req.TeamID, actor.ID, isAdmin)
	case "restore":
		_, err = uc.guidesService.BulkRestore(ctx, req.IDs, req.TeamID, actor.ID, isAdmin)
	case "permanently-delete":
		_, err = uc.guidesService.BulkPermanentlyDelete(ctx, req.IDs, req.TeamID, actor.ID, isAdmin)
	default:
		return fmt.Errorf("invalid bulk action: %s", action)
	}
	return err
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

	return uc.starredService.Star(ctx, actor.ID, guideID)
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

	return uc.starredService.Unstar(ctx, actor.ID, guideID)
}

func (uc *GuidesUseCase) GetStarred(ctx context.Context, actor *authulamodels.Actor, teamID string, page, limit int) ([]*models.Guide, int, error) {
	filter, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return nil, 0, err
	}

	parsedTeamID, err := uuidParse(teamID)
	if err != nil {
		return nil, 0, err
	}
	filter.TeamID = &parsedTeamID

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	filter.Offset = (page - 1) * limit
	filter.Limit = limit

	return uc.starredService.GetStarredGuides(ctx, filter)
}
