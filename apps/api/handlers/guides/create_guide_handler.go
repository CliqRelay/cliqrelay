package guides

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CreateGuideHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewCreateGuideHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *CreateGuideHandler {
	return &CreateGuideHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *CreateGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.CreateGuideRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}
		request.WorkspaceID = uuid.MustParse(r.PathValue("workspaceId"))
		if err := request.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		guide, err := h.guidesUseCase.Create(ctx, actor, &request)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.CreateGuideResponse{
			Guide: guide,
		})
	}
}
