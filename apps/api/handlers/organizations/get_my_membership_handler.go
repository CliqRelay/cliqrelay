package organizations

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/utils"
)

type GetMyMembershipHandler struct {
	organizationsUseCase interfaces.OrganizationsUseCase
}

func NewGetMyMembershipHandler(organizationsUseCase interfaces.OrganizationsUseCase) *GetMyMembershipHandler {
	return &GetMyMembershipHandler{organizationsUseCase: organizationsUseCase}
}

func (h *GetMyMembershipHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		reqCtx, ok := authulamodels.GetRequestContext(ctx)
		if !ok || reqCtx == nil {
			http.Error(w, "request context not found", http.StatusInternalServerError)
			return
		}

		orgID := r.PathValue("org_id")
		member, err := h.organizationsUseCase.GetMyMembership(ctx, reqCtx.Actor, orgID)
		if err != nil {
			reqCtx.SetJSONResponse(utils.ErrorStatus(err), map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, member)
	}
}
