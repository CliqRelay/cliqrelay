package guides

import (
	"log/slog"
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CreateDemoGuideHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewCreateDemoGuideHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *CreateDemoGuideHandler {
	return &CreateDemoGuideHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *CreateDemoGuideHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.CreateDemoGuideRequest
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

		slog.Debug("CreateDemoGuideHandler", "request", request)

		guideID, err := h.guidesUseCase.CreateDemoGuide(ctx, actor, request.WorkspaceID.String())
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.CreateDemoGuideResponse{
			GuideID: guideID,
		})
	}
}
