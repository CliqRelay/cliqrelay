package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/services/export"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type ExportGuideHandler struct {
	appConfig     *internal.AppConfig
	exportService *export.ExportService
}

func NewExportGuideHandler(appConfig *internal.AppConfig, exportService *export.ExportService) *ExportGuideHandler {
	return &ExportGuideHandler{appConfig: appConfig, exportService: exportService}
}

func (h *ExportGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		guideID := r.PathValue("id")
		if guideID == "" {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "guide ID is required"})
			reqCtx.Handled = true
			return
		}

		var request types.ExportGuideRequest
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

		exportID, err := h.exportService.RequestExport(reqCtx, guideID, request.Format)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusAccepted, &types.ExportGuideResponse{
			ExportID: exportID.String(),
			Status:   models.ExportStatusPending,
		})
	}
}
