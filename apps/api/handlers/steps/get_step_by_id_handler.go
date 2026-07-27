package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetStepByIDHandler struct {
	appConfig    *config.AppConfig
	stepsUseCase interfaces.StepsUseCase
}

func NewGetStepByIDHandler(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) *GetStepByIDHandler {
	return &GetStepByIDHandler{appConfig: appConfig, stepsUseCase: stepsUseCase}
}

func (h *GetStepByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		stepID := r.PathValue("id")

		step, err := h.stepsUseCase.Get(ctx, actor, stepID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetStepByIDResponse{
			Step: step,
		})
	}
}
