package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetStarredGuidesHandler struct {
	appConfig            *config.AppConfig
	starredGuidesService interfaces.StarredGuidesService
}

func NewGetStarredGuidesHandler(appConfig *config.AppConfig, starredGuidesService interfaces.StarredGuidesService) *GetStarredGuidesHandler {
	return &GetStarredGuidesHandler{appConfig: appConfig, starredGuidesService: starredGuidesService}
}

func (h *GetStarredGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		guides, err := h.starredGuidesService.GetStarredGuides(ctx, actor, workspaceID)
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
