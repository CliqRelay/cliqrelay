package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetStarredGuidesHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetStarredGuidesHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *GetStarredGuidesHandler {
	return &GetStarredGuidesHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *GetStarredGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.URL.Query().Get("workspace_id")

		guides, err := h.guidesUseCase.GetStarred(ctx, actor, workspaceID)
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
