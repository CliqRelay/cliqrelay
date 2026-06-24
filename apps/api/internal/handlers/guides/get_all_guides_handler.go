package guides

import (
	"net/http"

	"github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	guidesservice "github.com/CliqRelay/cliqrelay/internal/services/guides"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

type GetAllGuidesHandler struct {
	appConfig     *internal.AppConfig
	guidesService *guidesservice.GuidesService
}

func NewGetAllGuidesHandler(appConfig *internal.AppConfig, guidesService *guidesservice.GuidesService) *GetAllGuidesHandler {
	return &GetAllGuidesHandler{appConfig: appConfig, guidesService: guidesService}
}

func (h *GetAllGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := models.GetRequestContext(ctx)

		var status *string
		if s := r.URL.Query().Get("status"); s != "" {
			status = &s
		}

		guides, err := h.guidesService.GetAll(ctx, reqCtx.Actor.ID, status)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllGuidesResponse{
			Guides: guides,
		})
	}
}
