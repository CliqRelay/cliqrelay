package media_assets

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type GetAllMediaAssetsHandler struct {
	mediaAssetsUseCase interfaces.MediaAssetsUseCase
}

func NewGetAllMediaAssetsHandler(mediaAssetsUseCase interfaces.MediaAssetsUseCase) *GetAllMediaAssetsHandler {
	return &GetAllMediaAssetsHandler{mediaAssetsUseCase: mediaAssetsUseCase}
}

func (h *GetAllMediaAssetsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		stepID := r.URL.Query().Get("step_id")

		mediaAssets, err := h.mediaAssetsUseCase.ListByStep(ctx, actor, stepID)
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
