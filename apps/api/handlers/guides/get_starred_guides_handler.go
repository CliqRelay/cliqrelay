package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetStarredGuidesHandler struct {
	appConfig            *config.AppConfig
	starredGuidesService *starredguidesservice.StarredGuidesService
}

func NewGetStarredGuidesHandler(appConfig *config.AppConfig, starredGuidesService *starredguidesservice.StarredGuidesService) *GetStarredGuidesHandler {
	return &GetStarredGuidesHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *GetStarredGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guides, err := h.starredGuidesService.GetStarredGuides(ctx, reqCtx.Actor.ID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllGuidesResponse{
			Guides: guides,
		})
	}
}
