package starred_guides

import (
	"context"
	"strings"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService struct {
	starredGuidesRepo interfaces.StarredGuidesRepository
	guidesRepo        interfaces.GuidesRepository
	authzService      interfaces.AuthorizationService
}

func NewStarredGuidesService(
	starredGuidesRepo interfaces.StarredGuidesRepository,
	guidesRepo interfaces.GuidesRepository,
	authzService interfaces.AuthorizationService,
) *StarredGuidesService {
	return &StarredGuidesService{
		starredGuidesRepo: starredGuidesRepo,
		guidesRepo:        guidesRepo,
		authzService:      authzService,
	}
}

func (s *StarredGuidesService) Star(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) error {
	if actor == nil {
		return constants.ErrForbidden
	}

	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, workspaceID, guideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return constants.ErrGuideNotFound
	}

	if err := s.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return constants.ErrGuideNotFound
	}

	return s.starredGuidesRepo.Star(ctx, workspaceID, actor.ID, parsedID)
}

func (s *StarredGuidesService) Unstar(ctx context.Context, actor *authulamodels.Actor, workspaceID string, guideID string) error {
	if actor == nil {
		return constants.ErrForbidden
	}

	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, workspaceID, guideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return constants.ErrGuideNotFound
	}

	if err := s.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return constants.ErrGuideNotFound
	}

	return s.starredGuidesRepo.Unstar(ctx, workspaceID, actor.ID, parsedID)
}

func (s *StarredGuidesService) GetStarredGuides(ctx context.Context, actor *authulamodels.Actor, workspaceID string) ([]*models.Guide, error) {
	if actor == nil {
		return nil, constants.ErrForbidden
	}

	filter, err := s.authzService.GuideListFilter(ctx, actor, workspaceID)
	if err != nil {
		return nil, err
	}

	filter.ViewerUserID = &actor.ID

	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return nil, constants.ErrWorkspaceNotFound
	}
	filter.WorkspaceID = &parsedWSID

	rows, err := s.starredGuidesRepo.GetAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = true
	}

	return guides, nil
}
