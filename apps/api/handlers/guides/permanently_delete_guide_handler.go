package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type PermanentlyDeleteGuideHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewPermanentlyDeleteGuideHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *PermanentlyDeleteGuideHandler {
	return &PermanentlyDeleteGuideHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *PermanentlyDeleteGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		deleted, err := h.guidesUseCase.PermanentlyDelete(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.PermanentlyDeleteGuideResponse{
			Guide: deleted,
		})
	}
}
