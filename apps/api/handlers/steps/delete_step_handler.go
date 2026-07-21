package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type DeleteStepHandler struct {
	appConfig    *config.AppConfig
	stepsUseCase interfaces.StepsUseCase
}

func NewDeleteStepHandler(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) *DeleteStepHandler {
	return &DeleteStepHandler{appConfig: appConfig, stepsUseCase: stepsUseCase}
}

func (h *DeleteStepHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		stepID := r.PathValue("id")

		err := h.stepsUseCase.Delete(ctx, actor, stepID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteStepResponse{
			Message: "Step deleted successfully",
		})
	}
}
