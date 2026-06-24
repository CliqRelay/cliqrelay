package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetMediaAssetByIDHandler struct {
	appConfig          *internal.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewGetMediaAssetByIDHandler(appConfig *internal.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *GetMediaAssetByIDHandler {
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
