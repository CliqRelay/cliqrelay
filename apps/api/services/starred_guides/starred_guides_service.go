package starred_guides

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService struct {
	starredGuidesRepo interfaces.StarredGuidesRepository
}

func NewStarredGuidesService(starredGuidesRepo interfaces.StarredGuidesRepository) *StarredGuidesService {
	return &StarredGuidesService{starredGuidesRepo: starredGuidesRepo}
}

func (s *StarredGuidesService) Star(ctx context.Context, userID string, guideID string) error {
	if strings.TrimSpace(userID) == "" {
		return constants.ErrInvalidUserID
	}
	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}
	return s.starredGuidesRepo.Star(ctx, userID, parsedID)
}

func (s *StarredGuidesService) Unstar(ctx context.Context, userID string, guideID string) error {
	if strings.TrimSpace(userID) == "" {
		return constants.ErrInvalidUserID
	}
	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}
	return s.starredGuidesRepo.Unstar(ctx, userID, parsedID)
}

func (s *StarredGuidesService) GetStarredGuides(ctx context.Context, userID string) ([]*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	guides, err := s.starredGuidesRepo.GetStarredGuides(ctx, userID)
	if err != nil {
		return nil, err
	}

	return guides, nil
}
