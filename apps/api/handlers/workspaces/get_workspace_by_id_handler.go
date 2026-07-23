package workspaces

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetWorkspaceByIDHandler struct {
	appConfig        *config.AppConfig
	workspaceService interfaces.WorkspaceService
}

func NewGetWorkspaceByIDHandler(appConfig *config.AppConfig, workspaceService interfaces.WorkspaceService) *GetWorkspaceByIDHandler {
	return &GetWorkspaceByIDHandler{appConfig: appConfig, workspaceService: workspaceService}
}

func (h *GetWorkspaceByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		workspace, err := h.workspaceService.GetByID(ctx, actor, workspaceID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetWorkspaceByIDResponse{
			Workspace: workspace,
		})
	}
}
