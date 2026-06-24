package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	guidesservice "github.com/CliqRelay/cliqrelay/internal/services/guides"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetGuidesCountHandler struct {
	appConfig     *internal.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewGetGuidesCountHandler(appConfig *internal.AppConfig, guidesService *guidesservice.GuidesService) *GetGuidesCountHandler {
	return &GetGuidesCountHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *GetGuidesCountHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		count, err := h.guidesService.GetCount(ctx, reqCtx.Actor.ID)
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
