package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type UpdateMediaAssetHandler struct {
	appConfig          *internal.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewUpdateMediaAssetHandler(appConfig *internal.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *UpdateMediaAssetHandler {
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
