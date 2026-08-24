package teams

import (
	"fmt"
	"net/http"

	"github.com/Authula/authula"
	"github.com/Authula/authula/core/pagination"
	authulamodels "github.com/Authula/authula/models"
	organizations "github.com/Authula/authula/plugins/organizations"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
)

type GetTeamsHandler struct {
	auth *authula.Auth
}

func NewGetTeamsHandler(auth *authula.Auth) *GetTeamsHandler {
	return &GetTeamsHandler{auth: auth}
}

type teamResponse struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organization_id"`
	OwnerID        string `json:"owner_id"`
	Name           string `json:"name"`
	CreatedAt      string `json:"created_at"`
	UpdatedAt      string `json:"updated_at"`
}

type getAllTeamsResponse struct {
	Teams []teamResponse `json:"teams"`
}

func (h *GetTeamsHandler) Handle() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqCtx, _ := authulamodels.GetRequestContext(r.Context())
		actor := reqCtx.Actor

		plugin := h.auth.PluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String())
		orgPlugin, ok := plugin.(*organizations.OrganizationsPlugin)
		if !ok {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": "organizations plugin not found"})
			return
		}

		orgs, err := orgPlugin.Api.GetAllOrganizations(r.Context(), actor, pagination.Params{
			Page:  1,
			Limit: 1000,
		})
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": fmt.Sprintf("failed to list organizations: %v", err)})
			return
		}

		var teams []teamResponse
		for _, org := range orgs.Data {
			orgTeams, err := orgPlugin.Api.GetAllTeams(r.Context(), actor, org.ID, pagination.Params{
				Page:  1,
				Limit: 1000,
			})
			if err != nil {
				continue
			}

			isOwner := org.OwnerID == actor.ID

			var member *orgtypes.OrganizationMemberResponse
			if !isOwner {
				member, err = orgPlugin.Api.GetMemberByUserID(r.Context(), actor, org.ID, actor.ID)
				if err != nil || member == nil {
					continue
				}
			}

			for _, t := range orgTeams.Data {
				if !isOwner {
					teamMember, err := orgPlugin.Api.GetTeamMember(r.Context(), actor, org.ID, t.ID, member.ID)
					if err != nil || teamMember == nil {
						continue
					}
				}

				teams = append(teams, teamResponse{
					ID:             t.ID,
					Name:           t.Name,
					OrganizationID: t.OrganizationID,
					OwnerID:        actor.ID,
					CreatedAt:      t.CreatedAt.Format("2006-01-02T15:04:05Z"),
					UpdatedAt:      t.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				})
			}
		}

		reqCtx.SetJSONResponse(http.StatusOK, getAllTeamsResponse{Teams: teams})
	}
}
