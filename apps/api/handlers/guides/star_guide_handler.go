package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type StarGuideHandler struct {
	appConfig            *config.AppConfig
	starredGuidesService interfaces.StarredGuidesService
}

func NewStarGuideHandler(appConfig *config.AppConfig, starredGuidesService interfaces.StarredGuidesService) *StarGuideHandler {
	return &StarGuideHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *StarGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")
		guideID := r.PathValue("id")

		err := h.starredGuidesService.Star(ctx, actor, workspaceID, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.StarGuideResponse{
			Message: "Guide starred successfully",
		})
	}
}
