package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/types"
)

type TeamMembershipsService interface {
	GetMemberTeamIDs(ctx context.Context, actor *authulamodels.Actor, orgID string, memberID string) ([]string, error)
	SetMemberTeamIDs(ctx context.Context, actor *authulamodels.Actor, orgID string, memberID string, teamIDs []string) (*types.UpdateTeamMembershipsResponse, error)
}
