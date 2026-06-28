package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetMediaAssetByIDHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsService interfaces.MediaAssetsService
}

func NewGetMediaAssetByIDHandler(appConfig *config.AppConfig, mediaAssetsService interfaces.MediaAssetsService) *GetMediaAssetByIDHandler {
	return &GetMediaAssetByIDHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *GetMediaAssetByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)
		actor := reqCtx.Actor

		id := r.PathValue("id")

		mediaAsset, err := h.mediaAssetsService.GetByID(ctx, actor, id)
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
