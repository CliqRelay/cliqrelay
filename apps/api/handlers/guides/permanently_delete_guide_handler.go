package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type PermanentlyDeleteGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewPermanentlyDeleteGuideHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *PermanentlyDeleteGuideHandler {
	return &PermanentlyDeleteGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *PermanentlyDeleteGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		guide, err := h.guidesService.PermanentlyDelete(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.PermanentlyDeleteGuideResponse{
			Guide: guide,
		})
	}
}
