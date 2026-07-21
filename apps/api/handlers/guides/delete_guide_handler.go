package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type DeleteGuideHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewDeleteGuideHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *DeleteGuideHandler {
	return &DeleteGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *DeleteGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")
		guideID := r.PathValue("id")

		deletedGuide, err := h.guidesService.Delete(ctx, actor, workspaceID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteGuideResponse{
			Guide: deletedGuide,
		})
	}
}
