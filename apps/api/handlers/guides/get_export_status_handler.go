package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetExportStatusHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetExportStatusHandler(guidesUseCase interfaces.GuidesUseCase) *GetExportStatusHandler {
	return &GetExportStatusHandler{guidesUseCase: guidesUseCase}
}

func (h *GetExportStatusHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		exportID := r.PathValue("exportID")

		export, err := h.guidesUseCase.GetExportStatus(ctx, reqCtx.Actor, exportID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetExportStatusResponse{
			Export: export,
		})
	}
}
