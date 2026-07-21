package workspaces

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	cliqmodels "github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllWorkspacesHandler struct {
	appConfig        *config.AppConfig
	workspaceService interfaces.WorkspaceService
}

func NewGetAllWorkspacesHandler(appConfig *config.AppConfig, workspaceService interfaces.WorkspaceService) *GetAllWorkspacesHandler {
	return &GetAllWorkspacesHandler{appConfig: appConfig, workspaceService: workspaceService}
}

func (h *GetAllWorkspacesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var filter *types.WorkspaceFilter
		if t := r.URL.Query().Get("type"); t != "" {
			wsType := cliqmodels.WorkspaceType(t)
			filter = &types.WorkspaceFilter{Type: &wsType}
		}

		workspaces, err := h.workspaceService.GetAll(ctx, actor, filter)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllWorkspacesResponse{
			Workspaces: workspaces,
		})
	}
}
