package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	guidesservice "github.com/CliqRelay/cliqrelay/internal/services/guides"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type PermanentlyDeleteGuideHandler struct {
	appConfig     *internal.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewPermanentlyDeleteGuideHandler(appConfig *internal.AppConfig, guidesService *guidesservice.GuidesService) *PermanentlyDeleteGuideHandler {
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
