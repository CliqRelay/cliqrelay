package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type UnpublishGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewUnpublishGuideHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *UnpublishGuideHandler {
	return &UnpublishGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *UnpublishGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		guide, err := h.guidesService.Unpublish(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UnpublishGuideResponse{
			Guide: guide,
		})
	}
}
