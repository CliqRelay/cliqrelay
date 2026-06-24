package steps

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetAllStepsHandler struct {
	appConfig    *internal.AppConfig
	stepsService *stepsservice.StepsService
}

func NewGetAllStepsHandler(appConfig *internal.AppConfig, stepsService *stepsservice.StepsService) *GetAllStepsHandler {
	return &GetAllStepsHandler{appConfig: appConfig, stepsService: stepsService}
}

func (h *GetAllStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.URL.Query().Get("guideId")

		steps, err := h.stepsService.GetByGuideID(ctx, reqCtx.Actor.ID, guideID)
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
