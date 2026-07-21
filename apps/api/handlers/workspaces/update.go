package workspaces

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type UpdateWorkspaceHandler struct {
	appConfig        *config.AppConfig
	workspaceService interfaces.WorkspaceService
}

func NewUpdateWorkspaceHandler(appConfig *config.AppConfig, workspaceService interfaces.WorkspaceService) *UpdateWorkspaceHandler {
	return &UpdateWorkspaceHandler{appConfig: appConfig, workspaceService: workspaceService}
}

func (h *UpdateWorkspaceHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		var request types.UpdateWorkspaceRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}
		if err := request.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		workspace, err := h.workspaceService.Update(ctx, actor, workspaceID, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UpdateWorkspaceResponse{
			Workspace: workspace,
		})
	}
}
