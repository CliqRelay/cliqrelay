package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type UnstarGuideHandler struct {
	appConfig            *config.AppConfig
	starredGuidesService interfaces.StarredGuidesService
}

func NewUnstarGuideHandler(appConfig *config.AppConfig, starredGuidesService interfaces.StarredGuidesService) *UnstarGuideHandler {
	return &UnstarGuideHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *UnstarGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		err := h.starredGuidesService.Unstar(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UnstarGuideResponse{
			Message: "Guide unstarred successfully",
		})
	}
}
