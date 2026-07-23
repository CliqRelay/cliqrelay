package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllStepsHandler struct {
	appConfig    *config.AppConfig
	stepsUseCase interfaces.StepsUseCase
}

func NewGetAllStepsHandler(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) *GetAllStepsHandler {
	return &GetAllStepsHandler{appConfig: appConfig, stepsUseCase: stepsUseCase}
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
