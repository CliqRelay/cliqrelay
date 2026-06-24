package uploads

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/constants"
	uploadsservice "github.com/CliqRelay/cliqrelay/internal/services/uploads"
	"github.com/CliqRelay/cliqrelay/internal/types"
	"github.com/CliqRelay/cliqrelay/internal/utils"
)

type PresignUploadHandler struct {
	appConfig      *internal.AppConfig
	uploadsService *uploadsservice.UploadsService
}

func NewPresignUploadHandler(appConfig *internal.AppConfig, uploadsService *uploadsservice.UploadsService) *PresignUploadHandler {
	return &PresignUploadHandler{appConfig: appConfig, uploadsService: uploadsService}
}

func (h *PresignUploadHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		var request types.PresignUploadRequest
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

		result, err := h.uploadsService.GeneratePresignedPutURL(ctx, reqCtx.Actor.ID, request.GuideID, request.StepID)
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

		reqCtx.SetJSONResponse(http.StatusOK, &types.PresignUploadResponse{
			PresignedURL: result.URL,
			StoragePath:  result.StoragePath,
		})
	}
}
