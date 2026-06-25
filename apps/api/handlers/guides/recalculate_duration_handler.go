package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/types"
)

type RecalculateDurationHandler struct {
	appConfig     *config.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewRecalculateDurationHandler(appConfig *config.AppConfig, guidesService *guidesservice.GuidesService) *RecalculateDurationHandler {
	return &RecalculateDurationHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *RecalculateDurationHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		guideID := r.PathValue("id")

		guide, err := h.guidesService.RecalculateDuration(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.RecalculateDurationResponse{Guide: guide})
	}
}
