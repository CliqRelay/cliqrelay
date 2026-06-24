package health

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type HealthHandler struct {
	appConfig *internal.AppConfig
}

func NewHealthHandler(appConfig *internal.AppConfig) *HealthHandler {
	return &HealthHandler{appConfig: appConfig}
}

func (h *HealthHandler) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		reqCtx.SetJSONResponse(http.StatusOK, &types.HealthResponse{
			Status: "ok",
		})
	}
}
