package steps

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type ReorderStepsHandler struct {
	appConfig    *config.AppConfig
	stepsUseCase interfaces.StepsUseCase
}

func NewReorderStepsHandler(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) *ReorderStepsHandler {
	return &ReorderStepsHandler{appConfig: appConfig, stepsUseCase: stepsUseCase}
}

func (h *ReorderStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.ReorderStepsRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}
		request.WorkspaceID = uuid.MustParse(r.PathValue("workspaceId"))
		if err := request.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		steps, err := h.stepsUseCase.Reorder(ctx, actor, &request)
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
