package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/services/export"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetExportStatusHandler struct {
	appConfig     *config.AppConfig
	exportService *export.ExportService
}

func NewGetExportStatusHandler(appConfig *config.AppConfig, exportService *export.ExportService) *GetExportStatusHandler {
	return &GetExportStatusHandler{appConfig: appConfig, exportService: exportService}
}

func (h *GetExportStatusHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		exportID := r.PathValue("exportID")
		if exportID == "" {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "export ID is required"})
			reqCtx.Handled = true
			return
		}

		export, err := h.exportService.GetExportStatus(reqCtx, exportID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		if export == nil {
			reqCtx.SetJSONResponse(http.StatusNotFound, map[string]any{"message": "export not found"})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetExportStatusResponse{
			Export: export,
		})
	}
}
