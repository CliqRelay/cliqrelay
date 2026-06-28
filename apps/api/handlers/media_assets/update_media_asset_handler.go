package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type UpdateMediaAssetHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsService interfaces.MediaAssetsService
}

func NewUpdateMediaAssetHandler(appConfig *config.AppConfig, mediaAssetsService interfaces.MediaAssetsService) *UpdateMediaAssetHandler {
	return &UpdateMediaAssetHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *UpdateMediaAssetHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		id := r.PathValue("id")

		var request types.UpdateMediaAssetRequest
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

		mediaAsset, err := h.mediaAssetsService.Update(ctx, id, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.UpdateMediaAssetResponse{
			MediaAsset: mediaAsset,
		})
	}
}
