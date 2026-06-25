package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type PublishGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewPublishGuideHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *PublishGuideHandler {
	return &PublishGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *PublishGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		guide, err := h.guidesService.Publish(ctx, reqCtx.Actor.ID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.PublishGuideResponse{
			Guide: guide,
		})
	}
}
