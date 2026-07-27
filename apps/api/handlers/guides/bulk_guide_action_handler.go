package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type BulkGuideActionHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewBulkGuideActionHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *BulkGuideActionHandler {
	return &BulkGuideActionHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *BulkGuideActionHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		action := r.URL.Query().Get("action")
		if action == "" {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "action query parameter is required (delete, restore, permanently-delete)"})
			reqCtx.Handled = true
			return
		}

		var req types.BulkGuidesRequest
		if err := utils.ParseJSON(r, &req); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}
		if err := req.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		err := h.guidesUseCase.BulkAction(ctx, actor, action, &req)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.BulkGuidesResponse{Message: "Bulk action completed successfully"})
	}
}
