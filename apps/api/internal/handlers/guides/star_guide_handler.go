package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	starredguidesservice "github.com/CliqRelay/cliqrelay/internal/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type StarGuideHandler struct {
	appConfig            *internal.AppConfig
	starredGuidesService *starredguidesservice.StarredGuidesService
}

func NewStarGuideHandler(appConfig *internal.AppConfig, starredGuidesService *starredguidesservice.StarredGuidesService) *StarGuideHandler {
	return &StarGuideHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *StarGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		err := h.starredGuidesService.Star(ctx, reqCtx.Actor.ID, guideID)
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
