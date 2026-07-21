package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type ArchiveGuideHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewArchiveGuideHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *ArchiveGuideHandler {
	return &ArchiveGuideHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *ArchiveGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		guideID := r.PathValue("id")

		guide, err := h.guidesUseCase.Archive(ctx, actor, guideID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.ArchiveGuideResponse{
			Guide: guide,
		})
	}
}
