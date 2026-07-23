package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type DuplicateStepHandler struct {
	appConfig    *config.AppConfig
	stepsUseCase interfaces.StepsUseCase
}

func NewDuplicateStepHandler(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) *DuplicateStepHandler {
	return &DuplicateStepHandler{appConfig: appConfig, stepsUseCase: stepsUseCase}
}

func (h *DuplicateStepHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		stepID := r.PathValue("id")

		var request types.DuplicateStepRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		step, err := h.stepsUseCase.Duplicate(ctx, actor, stepID, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.DuplicateStepResponse{
			Step: step,
		})
	}
}
