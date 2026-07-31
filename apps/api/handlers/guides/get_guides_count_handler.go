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

		count, err := h.guidesUseCase.GetCount(ctx, actor, teamID)
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
