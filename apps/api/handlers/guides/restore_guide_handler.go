package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type RestoreGuideHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewRestoreGuideHandler(guidesUseCase interfaces.GuidesUseCase) *RestoreGuideHandler {
	return &RestoreGuideHandler{guidesUseCase: guidesUseCase}
}

func (h *RestoreGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		guide, err := h.guidesUseCase.Restore(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.RestoreGuideResponse{
			Guide: guide,
		})
	}
}
