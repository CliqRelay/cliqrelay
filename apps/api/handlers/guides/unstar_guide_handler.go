package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type UnstarGuideHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewUnstarGuideHandler(guidesUseCase interfaces.GuidesUseCase) *UnstarGuideHandler {
	return &UnstarGuideHandler{guidesUseCase: guidesUseCase}
}

func (h *UnstarGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		err := h.guidesUseCase.Unstar(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UnstarGuideResponse{
			Message: "Guide unstarred successfully",
		})
	}
}
