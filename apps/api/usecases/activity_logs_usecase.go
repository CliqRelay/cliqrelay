package usecases

import (
	"context"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

const (
	DefaultActivityLogsLimit = 10
	MaxActivityLogsLimit     = 50
)

type ActivityLogsUseCase struct {
	authzService        interfaces.AuthorizationService
	activityLogsService interfaces.ActivityLogsService
}

func NewActivityLogsUseCase(authzService interfaces.AuthorizationService, activityLogsService interfaces.ActivityLogsService) *ActivityLogsUseCase {
	return &ActivityLogsUseCase{authzService: authzService, activityLogsService: activityLogsService}
}

func (uc *ActivityLogsUseCase) List(ctx context.Context, actor *authulamodels.Actor, teamID string, limit int) ([]*models.ActivityLog, error) {
	parsedTeamID, viewerUserID, err := uc.authorizeTeam(ctx, actor, teamID)
	if err != nil {
		return nil, err
	}

	switch {
	case limit < 1:
		limit = DefaultActivityLogsLimit
	case limit > MaxActivityLogsLimit:
		limit = MaxActivityLogsLimit
	}

	return uc.activityLogsService.List(ctx, parsedTeamID, viewerUserID, limit)
}

func (uc *ActivityLogsUseCase) authorizeTeam(ctx context.Context, actor *authulamodels.Actor, teamID string) (uuid.UUID, string, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return uuid.Nil, "", constants.ErrTeamNotFound
	}

	filter, err := uc.authzService.GuideListFilter(ctx, actor, teamID)
	if err != nil {
		return uuid.Nil, "", err
	}

	viewerUserID := actor.ID
	if filter != nil && filter.ViewerUserID != nil {
		viewerUserID = *filter.ViewerUserID
	}
	return parsedTeamID, viewerUserID, nil
}
