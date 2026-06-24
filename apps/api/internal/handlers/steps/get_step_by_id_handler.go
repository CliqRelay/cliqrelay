package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetStepByIDHandler struct {
	appConfig    *internal.AppConfig
	stepsService *stepsservice.StepsService
}

func NewGetStepByIDHandler(appConfig *internal.AppConfig, stepsService *stepsservice.StepsService) *GetStepByIDHandler {
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
