package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/types"
)

type RestoreGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewRestoreGuideHandler(appConfig *config.AppConfig, guidesService *guidesservice.GuidesService) *RestoreGuideHandler {
	return &RestoreGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *RestoreGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		guide, err := h.guidesService.Restore(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.RestoreGuideResponse{
			Guide: guide,
		})
	}
}
