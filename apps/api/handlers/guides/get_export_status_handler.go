package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetExportStatusHandler struct {
	appConfig     *config.AppConfig
	exportService interfaces.ExportService
}

func NewGetExportStatusHandler(appConfig *config.AppConfig, exportService interfaces.ExportService) *GetExportStatusHandler {
	return &GetExportStatusHandler{appConfig: appConfig, exportService: exportService}
}

func (h *GetExportStatusHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		workspaceID := r.PathValue("workspaceId")
		exportID := r.PathValue("exportID")

		export, err := h.exportService.GetExportStatus(reqCtx, workspaceID, exportID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetExportStatusResponse{
			Export: export,
		})
	}
}
