package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllGuidesHandler struct {
	appConfig     *config.AppConfig
	guidesService interfaces.GuidesService
}

func NewGetAllGuidesHandler(appConfig *config.AppConfig, guidesService interfaces.GuidesService) *GetAllGuidesHandler {
	return &GetAllGuidesHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *GetAllGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		workspaceID := r.PathValue("workspaceId")

		var status *string
		if s := r.URL.Query().Get("status"); s != "" {
			status = &s
		}

		guides, err := h.guidesService.GetAll(ctx, actor, workspaceID, status)
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
