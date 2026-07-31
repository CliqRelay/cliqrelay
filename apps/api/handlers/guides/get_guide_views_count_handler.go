package guides

import (
	"net/http"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetGuideViewsCountHandler struct {
	guideViewsUseCase interfaces.GuideViewsUseCase
}

func NewGetGuideViewsCountHandler(guideViewsUseCase interfaces.GuideViewsUseCase) *GetGuideViewsCountHandler {
	return &GetGuideViewsCountHandler{guideViewsUseCase: guideViewsUseCase}
}

func (h *GetGuideViewsCountHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID, err := uuid.Parse(r.URL.Query().Get("team_id"))
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "invalid team ID"})
			reqCtx.Handled = true
			return
		}

		count, err := h.guideViewsUseCase.GetViewCount(ctx, actor, teamID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetGuideViewsCountResponse{
			Count: count,
		})
	}
}
