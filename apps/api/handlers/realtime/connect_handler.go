package realtime

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/utils"
)

type ConnectHandler struct {
	realtimeUseCase interfaces.RealtimeUseCase
}

func NewConnectHandler(realtimeUseCase interfaces.RealtimeUseCase) *ConnectHandler {
	return &ConnectHandler{realtimeUseCase: realtimeUseCase}
}

func (h *ConnectHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)

		connection, err := h.realtimeUseCase.Connect(ctx, reqCtx.Actor, r.URL.Query().Get("team_id"))
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, connection)
	}
}
