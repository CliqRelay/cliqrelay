package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type PublishGuideHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewPublishGuideHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *PublishGuideHandler {
	return &PublishGuideHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *PublishGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		guide, err := h.guidesUseCase.Publish(ctx, actor, guideID)
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
