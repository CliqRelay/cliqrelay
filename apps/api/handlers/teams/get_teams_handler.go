package teams

import (
	"net/http"
	"time"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetTeamsHandler struct {
	teamsUseCase interfaces.TeamsUseCase
}

func NewGetTeamsHandler(teamsUseCase interfaces.TeamsUseCase) *GetTeamsHandler {
	return &GetTeamsHandler{teamsUseCase: teamsUseCase}
}

func (h *GetTeamsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, ok := authulamodels.GetRequestContext(ctx)
		if !ok || reqCtx == nil {
			http.Error(w, "request context not found", http.StatusInternalServerError)
			return
		}

		rows, err := h.teamsUseCase.List(ctx, reqCtx.Actor)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		teams := make([]types.Team, 0, len(rows))
		for _, row := range rows {
			teams = append(teams, types.Team{
				ID:             row.ID,
				Name:           row.Name,
				OrganizationID: row.OrganizationID,
				// The organization's owner. The JSON field keeps its owner_id name
				// for contract compatibility even though the team itself has no owner.
				OwnerID:   row.OwnerID,
				CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339),
				UpdatedAt: row.UpdatedAt.UTC().Format(time.RFC3339),
			})
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllTeamsResponse{Teams: teams})
	}
}
