package guides

import (
	"net/http"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetGuideViewsCountHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetGuideViewsCountHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *GetGuideViewsCountHandler {
	return &GetGuideViewsCountHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
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

		count, err := h.guidesUseCase.GetViewCount(ctx, actor, teamID)
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
