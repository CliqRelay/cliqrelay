package media_assets

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetMediaAssetByIDHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsUseCase interfaces.MediaAssetsUseCase
}

func NewGetMediaAssetByIDHandler(appConfig *config.AppConfig, mediaAssetsUseCase interfaces.MediaAssetsUseCase) *GetMediaAssetByIDHandler {
	return &GetMediaAssetByIDHandler{appConfig: appConfig, mediaAssetsUseCase: mediaAssetsUseCase}
}

func (h *GetMediaAssetByIDHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		mediaAssetID := r.PathValue("id")

		mediaAsset, err := h.mediaAssetsUseCase.Get(ctx, actor, mediaAssetID)
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
