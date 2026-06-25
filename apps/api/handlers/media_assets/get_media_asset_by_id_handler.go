package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	media_assetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetMediaAssetByIDHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewGetMediaAssetByIDHandler(appConfig *config.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *GetMediaAssetByIDHandler {
	return &GetMediaAssetByIDHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *GetMediaAssetByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		id := r.PathValue("id")

		mediaAsset, err := h.mediaAssetsService.GetByID(ctx, id)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetMediaAssetByIDResponse{
			MediaAsset: mediaAsset,
		})
	}
}
