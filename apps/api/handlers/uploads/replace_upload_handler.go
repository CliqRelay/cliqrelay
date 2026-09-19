package uploads

import (
	"errors"
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type ReplaceUploadHandler struct {
	uploadsUseCase interfaces.UploadsUseCase
}

func NewReplaceUploadHandler(uploadsUseCase interfaces.UploadsUseCase) *ReplaceUploadHandler {
	return &ReplaceUploadHandler{uploadsUseCase: uploadsUseCase}
}

func (h *ReplaceUploadHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.ReplaceUploadRequest
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

		result, err := h.uploadsUseCase.ReplaceUpload(ctx, actor, &request)
		if err != nil {
			status := utils.ErrorStatus(err)
			switch {
			case errors.Is(err, constants.ErrStepNotFound), errors.Is(err, constants.ErrGuideNotFound):
				status = http.StatusNotFound
			case errors.Is(err, constants.ErrInvalidStepID), errors.Is(err, constants.ErrInvalidStoragePath):
				status = http.StatusBadRequest
			}
			reqCtx.SetJSONResponse(status, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, result)
	}
}
