package teams

import (
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

type MembershipsHandler struct {
	appConfig       *config.AppConfig
	membershipsCase interfaces.TeamMembershipsUseCase
}

func NewMembershipsHandler(appConfig *config.AppConfig, membershipsCase interfaces.TeamMembershipsUseCase) *MembershipsHandler {
	return &MembershipsHandler{appConfig: appConfig, membershipsCase: membershipsCase}
}

func (h *MembershipsHandler) HandleGet() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqCtx, _ := authulamodels.GetRequestContext(r.Context())
		actor := reqCtx.Actor
		memberID := r.PathValue("memberId")
		orgID := r.URL.Query().Get("organization_id")

		if orgID == "" {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": "organization_id is required"})
			reqCtx.Handled = true
			return
		}

		resp, err := h.membershipsCase.Get(r.Context(), actor, memberID, orgID)
		if err != nil {
			status := http.StatusInternalServerError
			if err.Error() == "organization not found" || err.Error() == "member not found in organization" {
				status = http.StatusNotFound
			} else if err.Error() == "forbidden" || err.Error() == "admin access required" {
				status = http.StatusForbidden
			}
			reqCtx.SetJSONResponse(status, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, resp)
	}
}

func (h *MembershipsHandler) HandlePut() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqCtx, _ := authulamodels.GetRequestContext(r.Context())
		actor := reqCtx.Actor
		memberID := r.PathValue("memberId")

		var request types.UpdateTeamMembershipsRequest
		if err := utils.ParseJSON(r, &request); err != nil {
			reqCtx.SetJSONResponse(http.StatusUnprocessableEntity, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		resp, err := h.membershipsCase.Update(r.Context(), actor, memberID, &request)
		if err != nil {
			status := http.StatusInternalServerError
			if err.Error() == "organization not found" || err.Error() == "member not found in organization" {
				status = http.StatusNotFound
			} else if err.Error() == "forbidden" || err.Error() == "admin access required" {
				status = http.StatusForbidden
			}
			reqCtx.SetJSONResponse(status, map[string]any{"message": err.Error()})
			reqCtx.Handled = true
			return
		}

		reqCtx.SetJSONResponse(http.StatusOK, resp)
	}
}
