package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllMediaAssetsHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsService interfaces.MediaAssetsService
}

func NewGetAllMediaAssetsHandler(appConfig *config.AppConfig, mediaAssetsService interfaces.MediaAssetsService) *GetAllMediaAssetsHandler {
	return &GetAllMediaAssetsHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *GetAllMediaAssetsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		stepID := r.URL.Query().Get("stepId")

		mediaAssets, err := h.mediaAssetsService.GetByStepID(ctx, actor, stepID)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllMediaAssetsResponse{
			MediaAssets: mediaAssets,
		})
	}
}
