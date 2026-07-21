package teams

import (
	"fmt"
	"net/http"

	authulamodels "github.com/Authula/authula/models"
	organizations "github.com/Authula/authula/plugins/organizations"

	"github.com/CliqRelay/cliqrelay/config"
)

type GetTeamsHandler struct {
	appConfig *config.AppConfig
}

func NewGetTeamsHandler(appConfig *config.AppConfig) *GetTeamsHandler {
	return &GetTeamsHandler{appConfig: appConfig}
}

type teamResponse struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	OrganizationID string `json:"organization_id"`
	OwnerID        string `json:"owner_id"`
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

		plugin := h.appConfig.AuthulaInstance.PluginRegistry.GetPlugin("organizations")
		orgPlugin, ok := plugin.(*organizations.OrganizationsPlugin)
		if !ok {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": "organizations plugin not found"})
			return
		}

		orgs, err := orgPlugin.Api.GetAllOrganizationsByOwner(r.Context(), actor)
		if err != nil {
			reqCtx.SetJSONResponse(http.StatusInternalServerError, map[string]any{"message": fmt.Sprintf("failed to list organizations: %v", err)})
			return
		}

		var teams []teamResponse
		for _, org := range orgs {
			orgTeams, err := orgPlugin.Api.GetAllTeams(r.Context(), actor, org.ID)
			if err != nil {
				continue
			}
			for _, t := range orgTeams {
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
