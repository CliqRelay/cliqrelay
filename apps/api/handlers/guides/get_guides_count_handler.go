package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetGuidesCountHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewGetGuidesCountHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *GetGuidesCountHandler {
	return &GetGuidesCountHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *GetGuidesCountHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		count, err := h.guidesService.GetCount(ctx, actor, workspaceID)
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
