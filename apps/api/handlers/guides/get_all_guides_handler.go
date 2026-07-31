package guides

import (
	"net/http"
	"strconv"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetAllGuidesHandler struct {
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetAllGuidesHandler(guidesUseCase interfaces.GuidesUseCase) *GetAllGuidesHandler {
	return &GetAllGuidesHandler{guidesUseCase: guidesUseCase}
}

func (h *GetAllGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID := r.URL.Query().Get("team_id")

		var status *string
		if s := r.URL.Query().Get("status"); s != "" {
			status = &s
		}

		var excludeArchived bool
		if ea := r.URL.Query().Get("exclude_archived"); ea == "true" {
			excludeArchived = true
		}

		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}

		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit < 1 {
			limit = 10
		}
		if limit > 100 {
			limit = 100
		}

		sortBy := r.URL.Query().Get("sort_by")
		sortDir := r.URL.Query().Get("sort_dir")

		guides, total, err := h.guidesUseCase.List(ctx, actor, teamID, status, excludeArchived, page, limit, sortBy, sortDir)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllGuidesResponse{
			Data:  guides,
			Total: total,
			Page:  page,
			Limit: limit,
		})
	}
}
