package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type DeleteMediaAssetHandler struct {
	appConfig          *internal.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewDeleteMediaAssetHandler(appConfig *internal.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *DeleteMediaAssetHandler {
	return &DeleteMediaAssetHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *DeleteMediaAssetHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		id := r.PathValue("id")

		_, err := h.mediaAssetsService.Delete(ctx, id)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteMediaAssetResponse{
			Message: "Media asset deleted successfully",
		})
	}
}
