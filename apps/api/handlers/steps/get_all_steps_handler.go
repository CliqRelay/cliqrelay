package steps

import (
	"net/http"
	"strconv"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

const (
	defaultStepsLimit = 20
	maxStepsLimit     = 100
)

type GetAllStepsHandler struct {
	stepsUseCase interfaces.StepsUseCase
}

func NewGetAllStepsHandler(stepsUseCase interfaces.StepsUseCase) *GetAllStepsHandler {
	return &GetAllStepsHandler{stepsUseCase: stepsUseCase}
}

func (h *GetAllStepsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		if limit < 1 {
			limit = defaultStepsLimit
		}
		if limit > maxStepsLimit {
			limit = maxStepsLimit
		}

		request := types.StepsByGuideIDQuery{
			GuideID: r.URL.Query().Get("guide_id"),
			Cursor:  r.URL.Query().Get("cursor"),
			Limit:   limit,
		}
		if err := request.Validate(); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		var cursor *string
		if request.Cursor != "" {
			cursor = &request.Cursor
		}

		page, err := h.stepsUseCase.ListByGuide(ctx, actor, &types.ListStepsParams{
			GuideID: request.GuideID,
			Cursor:  cursor,
			Limit:   request.Limit,
		})
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, &types.GetAllStepsResponse{
			Steps:      page.Steps,
			NextCursor: page.NextCursor,
			Total:      page.Total,
		})
	}
}
