package media_assets

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	media_assetsservice "github.com/CliqRelay/cliqrelay/internal/services/media_assets"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetAllMediaAssetsHandler struct {
	appConfig          *internal.AppConfig
	mediaAssetsService *media_assetsservice.MediaAssetsService
}

func NewGetAllMediaAssetsHandler(appConfig *internal.AppConfig, mediaAssetsService *media_assetsservice.MediaAssetsService) *GetAllMediaAssetsHandler {
	return &GetAllMediaAssetsHandler{appConfig: appConfig, mediaAssetsService: mediaAssetsService}
}

func (h *GetAllMediaAssetsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		stepID := r.URL.Query().Get("stepId")

		mediaAssets, err := h.mediaAssetsService.GetByStepID(ctx, reqCtx.Actor.ID, stepID)
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
