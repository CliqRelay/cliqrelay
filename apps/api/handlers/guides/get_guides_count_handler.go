package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetGuidesCountHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetGuidesCountHandler(guidesUseCase interfaces.GuidesUseCase) *GetGuidesCountHandler {
	return &GetGuidesCountHandler{guidesUseCase: guidesUseCase}
}

func (h *GetGuidesCountHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID := r.URL.Query().Get("team_id")
		orgID := r.URL.Query().Get("organization_id")

		if teamID == "" && orgID == "" {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "either team_id or organization_id is required"})
			reqCtx.Handled = true
			return
		}
		if teamID != "" && orgID != "" {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "provide only one of team_id or organization_id"})
			reqCtx.Handled = true
			return
		}

		var count int
		var err error
		if orgID != "" {
			count, err = h.guidesUseCase.GetOrganizationCount(ctx, actor, orgID)
		} else {
			count, err = h.guidesUseCase.GetCount(ctx, actor, teamID)
		}
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetGuidesCountResponse{
			Count: count,
		})
	}
}
