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

func (s *StarredGuidesService) Star(ctx context.Context, userID string, guideID string) error {
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

	return s.starredGuidesRepo.Star(ctx, userID, parsedID)
}

func (s *StarredGuidesService) Unstar(ctx context.Context, userID string, guideID string) error {
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

	return s.starredGuidesRepo.Unstar(ctx, userID, parsedID)
}

func (s *StarredGuidesService) IsStarred(ctx context.Context, guideID string, userID string) (bool, error) {
	if strings.TrimSpace(guideID) == "" {
		return false, constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return false, constants.ErrInvalidGuideID
	}

	return s.starredGuidesRepo.IsStarred(ctx, parsedID, userID)
}

func (s *StarredGuidesService) GetStarredGuides(ctx context.Context, filter *types.GuideFilter) ([]*models.Guide, int, error) {
	rows, total, err := s.starredGuidesRepo.GetAll(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = true
	}

	return guides, total, nil
}
