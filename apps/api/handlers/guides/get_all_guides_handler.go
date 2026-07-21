package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllGuidesHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetAllGuidesHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *GetAllGuidesHandler {
	return &GetAllGuidesHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *GetAllGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.URL.Query().Get("workspace_id")

		var status *string
		if s := r.URL.Query().Get("status"); s != "" {
			status = &s
		}

		guides, err := h.guidesUseCase.List(ctx, actor, workspaceID, status)
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
