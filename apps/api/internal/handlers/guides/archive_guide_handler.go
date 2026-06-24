package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	guidesservice "github.com/CliqRelay/cliqrelay/internal/services/guides"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type ArchiveGuideHandler struct {
	appConfig     *internal.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewArchiveGuideHandler(appConfig *internal.AppConfig, guidesService *guidesservice.GuidesService) *ArchiveGuideHandler {
	return &ArchiveGuideHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *ArchiveGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		guideID := r.PathValue("id")

		guide, err := h.guidesService.Archive(ctx, reqCtx.Actor.ID, guideID)
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
