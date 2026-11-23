package steps

import (
	"errors"
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type CreateStepHandler struct {
	stepsUseCase interfaces.StepsUseCase
}

func NewCreateStepHandler(stepsUseCase interfaces.StepsUseCase) *CreateStepHandler {
	return &CreateStepHandler{stepsUseCase: stepsUseCase}
}

func (h *CreateStepHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, _ := authulamodels.GetRequestContext(ctx)
		actor := reqCtx.Actor

		var request types.CreateStepRequest
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

		step, err := h.stepsUseCase.Create(ctx, actor, &request)
		if err != nil {
			reqCtx.SetJSONResponse(createStepErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusCreated, &types.CreateStepResponse{
			Step: step,
		})
	}
}

func createStepErrorStatus(err error) int {
	if errors.Is(err, constants.ErrClientIDConflict) || errors.Is(err, constants.ErrGuideDeleted) {
		return http.StatusConflict
	}

	return http.StatusInternalServerError
}
