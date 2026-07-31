package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type UnpublishGuideHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewUnpublishGuideHandler(guidesUseCase interfaces.GuidesUseCase) *UnpublishGuideHandler {
	return &UnpublishGuideHandler{guidesUseCase: guidesUseCase}
}

func (h *UnpublishGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		guide, err := h.guidesUseCase.Unpublish(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UnpublishGuideResponse{
			Guide: guide,
		})
	}
}
