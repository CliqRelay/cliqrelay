package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type CreateStepHandler struct {
	appConfig    *internal.AppConfig
	stepsService *stepsservice.StepsService
}

func NewCreateStepHandler(appConfig *internal.AppConfig, stepsService *stepsservice.StepsService) *CreateStepHandler {
	return &CreateStepHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *CreateStepHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		var request types.CreateStepRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}
		if err := request.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		step, err := h.stepsService.Create(ctx, reqCtx.Actor.ID, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.CreateStepResponse{
			Step: step,
		})
	}
}
