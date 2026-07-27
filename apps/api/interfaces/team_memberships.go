package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/types"
)

type TeamMembershipsUseCase interface {
	Get(ctx context.Context, actor *authulamodels.Actor, memberID string, orgID string) (*types.GetTeamMembershipsResponse, error)
	Update(ctx context.Context, actor *authulamodels.Actor, memberID string, req *types.UpdateTeamMembershipsRequest) (*types.UpdateTeamMembershipsResponse, error)
}
