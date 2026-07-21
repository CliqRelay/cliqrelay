package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllStepsHandler struct {
	appConfig    *config.AppConfig
	stepsService interfaces.StepsService
}

func NewGetAllStepsHandler(appConfig *config.AppConfig, stepsService interfaces.StepsService) *GetAllStepsHandler {
	return &GetAllStepsHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *GetAllStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")
		guideID := r.URL.Query().Get("guide_id")

		steps, err := h.stepsService.GetByGuideID(ctx, actor, workspaceID, guideID)
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
