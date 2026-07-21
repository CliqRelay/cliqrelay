package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type DeleteStepHandler struct {
	appConfig    *config.AppConfig
	stepsService interfaces.StepsService
}

func NewDeleteStepHandler(appConfig *config.AppConfig, stepsService interfaces.StepsService) *DeleteStepHandler {
	return &DeleteStepHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *DeleteStepHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")
		stepID := r.PathValue("id")

		err := h.stepsService.Delete(ctx, actor, workspaceID, stepID)
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
