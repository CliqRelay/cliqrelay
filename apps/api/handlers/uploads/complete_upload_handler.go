package uploads

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CompleteUploadHandler struct {
	appConfig      *config.AppConfig
	uploadsUseCase interfaces.UploadsUseCase
}

func NewCompleteUploadHandler(appConfig *config.AppConfig, uploadsUseCase interfaces.UploadsUseCase) *CompleteUploadHandler {
	return &CompleteUploadHandler{appConfig: appConfig, uploadsUseCase: uploadsUseCase}
}

func (h *CompleteUploadHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.CompleteUploadRequest
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

		result, err := h.uploadsUseCase.CompleteUpload(ctx, actor, &request)
		if err != nil {
			status := http.StatusInternalServerError
			switch err {
			case constants.ErrGuideNotFound, constants.ErrStepNotFound, constants.ErrStepNotInGuide:
				status = http.StatusNotFound
			case constants.ErrInvalidUserID, constants.ErrInvalidGuideID, constants.ErrInvalidStepID:
				status = http.StatusBadRequest
			}
			reqCtx.SetJSONResponse(status, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.CompleteUploadResponse{
			URL:         result.URL,
			StoragePath: result.StoragePath,
		})
	}
}
