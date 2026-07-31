package guides

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetTimeSavedHandler struct {
	guideViewsUseCase interfaces.GuideViewsUseCase
}

func NewGetTimeSavedHandler(guideViewsUseCase interfaces.GuideViewsUseCase) *GetTimeSavedHandler {
	return &GetTimeSavedHandler{guideViewsUseCase: guideViewsUseCase}
}

func (h *GetTimeSavedHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID, err := uuid.Parse(r.URL.Query().Get("team_id"))
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "invalid team ID"})
			reqCtx.Handled = true
			return
		}

		var since *time.Time
		if sinceStr := r.URL.Query().Get("since"); sinceStr != "" {
			parsed, err := time.Parse(time.RFC3339, sinceStr)
			if err != nil {
				reqCtx.SetJSONResponse(http.StatusBadRequest, map[string]any{"message": "invalid since timestamp"})
				reqCtx.Handled = true
				return
			}
			since = &parsed
		}

		seconds, err := h.guideViewsUseCase.GetTimeSaved(ctx, actor, teamID, since)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetTimeSavedResponse{
			TimeSavedSeconds: seconds,
			TimeSavedHours:   utils.ConvertSecondsToHours(seconds),
		})
	}
}
