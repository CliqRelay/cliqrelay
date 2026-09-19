package media_assets

import (
	"errors"
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type DeleteMediaAssetHandler struct {
	mediaAssetsUseCase interfaces.MediaAssetsUseCase
}

func NewDeleteMediaAssetHandler(mediaAssetsUseCase interfaces.MediaAssetsUseCase) *DeleteMediaAssetHandler {
	return &DeleteMediaAssetHandler{mediaAssetsUseCase: mediaAssetsUseCase}
}

func (h *DeleteMediaAssetHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		mediaAssetID := r.PathValue("id")

		_, err := h.mediaAssetsUseCase.Delete(ctx, actor, mediaAssetID)
		if err != nil {
			status := utils.ErrorStatus(err)
			switch {
			case errors.Is(err, constants.ErrMediaAssetNotFound):
				status = http.StatusNotFound
			case errors.Is(err, constants.ErrInvalidMediaAssetID):
				status = http.StatusBadRequest
			}
			reqCtx.SetJSONResponse(status, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.DeleteMediaAssetResponse{
			Message: "Media asset deleted successfully",
		})
	}
}
