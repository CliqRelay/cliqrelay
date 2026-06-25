package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/types"
)

type UnstarGuideHandler struct {
	appConfig            *config.AppConfig
	starredGuidesService *starredguidesservice.StarredGuidesService
}

func NewUnstarGuideHandler(appConfig *config.AppConfig, starredGuidesService *starredguidesservice.StarredGuidesService) *UnstarGuideHandler {
	return &UnstarGuideHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *UnstarGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		err := h.starredGuidesService.Unstar(ctx, reqCtx.Actor.ID, guideID)
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
