package teams

import (
	"context"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

type TeamsService struct {
	teamsRepo interfaces.TeamsRepository
}

func NewTeamsService(teamsRepo interfaces.TeamsRepository) *TeamsService {
	return &TeamsService{teamsRepo: teamsRepo}
}

func (s *TeamsService) GetAllAccessibleByUserID(ctx context.Context, userID string) ([]*models.Team, error) {
	return s.teamsRepo.GetAllAccessibleByUserID(ctx, userID)
}

func (s *TeamsService) GetAccessibleByUserID(ctx context.Context, userID, teamID string) (*models.Team, error) {
	return s.teamsRepo.GetAccessibleByUserID(ctx, userID, teamID)
}
