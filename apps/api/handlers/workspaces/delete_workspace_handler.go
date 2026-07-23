package workspaces

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type DeleteWorkspaceHandler struct {
	appConfig        *config.AppConfig
	workspaceService interfaces.WorkspaceService
}

func NewDeleteWorkspaceHandler(appConfig *config.AppConfig, workspaceService interfaces.WorkspaceService) *DeleteWorkspaceHandler {
	return &DeleteWorkspaceHandler{appConfig: appConfig, workspaceService: workspaceService}
}

func (h *DeleteWorkspaceHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		err := h.workspaceService.Delete(ctx, actor, workspaceID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteWorkspaceResponse{
			Message: "Workspace deleted successfully",
		})
	}
}
