package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/types"
)

type DeleteGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewDeleteGuideHandler(appConfig *config.AppConfig, guidesService *guidesservice.GuidesService) *DeleteGuideHandler {
	return &DeleteGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *DeleteGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		deletedGuide, err := h.guidesService.Delete(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteGuideResponse{
			Guide: deletedGuide,
		})
	}
}
