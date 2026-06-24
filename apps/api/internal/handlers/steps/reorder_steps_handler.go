package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type ReorderStepsHandler struct {
	appConfig    *internal.AppConfig
	stepsService *stepsservice.StepsService
}

func NewReorderStepsHandler(appConfig *internal.AppConfig, stepsService *stepsservice.StepsService) *ReorderStepsHandler {
	return &ReorderStepsHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *ReorderStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		var request types.ReorderStepsRequest
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

		steps, err := h.stepsService.Reorder(ctx, reqCtx.Actor.ID, request.GuideID.String(), request.TargetStepID, request.PrevStepID, request.NextStepID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.ReorderStepsResponse{
			Steps: steps,
		})
	}
}
