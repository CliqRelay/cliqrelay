package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetGuidesCountHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetGuidesCountHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *GetGuidesCountHandler {
	return &GetGuidesCountHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *GetGuidesCountHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID := r.URL.Query().Get("team_id")

		count, err := h.guidesUseCase.GetCount(ctx, actor, teamID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetGuidesCountResponse{
			Count: count,
		})
	}
}
