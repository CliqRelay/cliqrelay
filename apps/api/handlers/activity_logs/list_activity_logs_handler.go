package activitylogs

import (
	"net/http"
	"strconv"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type ListActivityLogsHandler struct {
	activityLogsUseCase interfaces.ActivityLogsUseCase
}

func NewListActivityLogsHandler(activityLogsUseCase interfaces.ActivityLogsUseCase) *ListActivityLogsHandler {
	return &ListActivityLogsHandler{activityLogsUseCase: activityLogsUseCase}
}

func (h *ListActivityLogsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		teamID := r.URL.Query().Get("team_id")
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

		logs, err := h.activityLogsUseCase.List(ctx, reqCtx.Actor, teamID, limit)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.ListActivityLogsResponse{Data: logs})
	}
}
