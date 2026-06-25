package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetStepByIDHandler struct {
	appConfig    *config.AppConfig
	stepsService interfaces.StepsService
}

func NewGetStepByIDHandler(appConfig *config.AppConfig, stepsService interfaces.StepsService) *GetStepByIDHandler {
	return &GetStepByIDHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *GetStepByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		stepID := r.PathValue("id")

		step, err := h.stepsService.GetByID(ctx, stepID)
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
