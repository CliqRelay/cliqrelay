package uploads

import (
	"errors"
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CompleteUploadHandler struct {
	appConfig      *config.AppConfig
	uploadsService interfaces.UploadsService
}

func NewCompleteUploadHandler(appConfig *config.AppConfig, uploadsService interfaces.UploadsService) *CompleteUploadHandler {
	return &CompleteUploadHandler{appConfig: appConfig, uploadsService: uploadsService}
}

func (h *CompleteUploadHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

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

		result, err := h.uploadsService.CompleteUpload(ctx, request.StepID, request.StoragePath, request.FileSize, request.MimeType, request.Thumbnail, request.Width, request.Height)
		if err != nil {
			status := http.StatusInternalServerError
			switch {
			case errors.Is(err, constants.ErrStepNotFound), errors.Is(err, constants.ErrGuideNotFound):
				status = http.StatusNotFound
			case errors.Is(err, constants.ErrInvalidUserID), errors.Is(err, constants.ErrInvalidStepID):
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
