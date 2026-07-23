package media_assets

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CreateMediaAssetHandler struct {
	appConfig          *config.AppConfig
	mediaAssetsUseCase interfaces.MediaAssetsUseCase
}

func NewCreateMediaAssetHandler(appConfig *config.AppConfig, mediaAssetsUseCase interfaces.MediaAssetsUseCase) *CreateMediaAssetHandler {
	return &CreateMediaAssetHandler{appConfig: appConfig, mediaAssetsUseCase: mediaAssetsUseCase}
}

func (h *CreateMediaAssetHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

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

		mediaAsset, err := h.mediaAssetsUseCase.Create(ctx, actor, &request)
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
