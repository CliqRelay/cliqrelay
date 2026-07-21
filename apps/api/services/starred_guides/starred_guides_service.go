package starred_guides

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StarredGuidesService struct {
	starredGuidesRepo interfaces.StarredGuidesRepository
	guidesRepo        interfaces.GuidesRepository
}

func NewStarredGuidesService(
	starredGuidesRepo interfaces.StarredGuidesRepository,
	guidesRepo interfaces.GuidesRepository,
) *StarredGuidesService {
	return &StarredGuidesService{
		starredGuidesRepo: starredGuidesRepo,
		guidesRepo:        guidesRepo,
	}
}

func (s *StarredGuidesService) Star(ctx context.Context, guideID string) error {
	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return constants.ErrGuideNotFound
	}

	return s.starredGuidesRepo.Star(ctx, guide.WorkspaceID.String(), guide.CreatorID, parsedID)
}

func (s *StarredGuidesService) Unstar(ctx context.Context, guideID string) error {
	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return constants.ErrGuideNotFound
	}

	return s.starredGuidesRepo.Unstar(ctx, guide.WorkspaceID.String(), guide.CreatorID, parsedID)
}

func (s *StarredGuidesService) GetStarredGuides(ctx context.Context, workspaceID string) ([]*models.Guide, error) {
	filter := &types.GuideFilter{}

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
