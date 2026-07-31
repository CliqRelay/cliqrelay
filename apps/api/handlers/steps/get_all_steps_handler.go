package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllStepsHandler struct {
	stepsUseCase interfaces.StepsUseCase
}

func NewGetAllStepsHandler(stepsUseCase interfaces.StepsUseCase) *GetAllStepsHandler {
	return &GetAllStepsHandler{stepsUseCase: stepsUseCase}
}

func (h *GetAllStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.URL.Query().Get("guide_id")

		steps, err := h.stepsUseCase.ListByGuide(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllStepsResponse{
			Steps: steps,
		})
	}
}
