package guides

import (
	"net/http"
	"strconv"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetStarredGuidesHandler struct {
	appConfig     *config.AppConfig
	guidesUseCase interfaces.GuidesUseCase
}

func NewGetStarredGuidesHandler(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase) *GetStarredGuidesHandler {
	return &GetStarredGuidesHandler{appConfig: appConfig, guidesUseCase: guidesUseCase}
}

func (h *GetStarredGuidesHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		teamID := r.URL.Query().Get("team_id")

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

		guides, total, err := h.guidesUseCase.GetStarred(ctx, actor, teamID, page, limit)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetStarredGuidesResponse{
			Data:  guides,
			Total: total,
			Page:  page,
			Limit: limit,
		})
	}
}
