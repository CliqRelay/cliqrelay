package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type CreateMediaAssetHandler struct {
	appConfig          *internal.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewCreateMediaAssetHandler(appConfig *internal.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *CreateMediaAssetHandler {
	return &CreateMediaAssetHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *CreateMediaAssetHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		var request types.CreateMediaAssetRequest
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

		mediaAsset, err := h.mediaAssetsService.Create(ctx, reqCtx.Actor.ID, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.CreateMediaAssetResponse{
			MediaAsset: mediaAsset,
		})
	}
}
