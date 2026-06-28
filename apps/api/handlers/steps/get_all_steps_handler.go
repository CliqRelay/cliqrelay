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

		guideID := r.URL.Query().Get("guideId")

		steps, err := h.stepsService.GetByGuideID(ctx, guideID)
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
