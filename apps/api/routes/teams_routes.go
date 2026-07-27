package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/teams"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func TeamsRoutes(appConfig *config.AppConfig, teamMembershipsUseCase interfaces.TeamMembershipsUseCase) []authulamodels.Route {
	teamsHandler := teams.NewGetTeamsHandler(appConfig)
	membershipsHandler := teams.NewMembershipsHandler(appConfig, teamMembershipsUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	return []authulamodels.Route{
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/teams", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    teamsHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/teams/members/{memberId}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    membershipsHandler.HandleGet(),
		},
		{
			Method:     "PUT",
			Path:       fmt.Sprintf("%s/teams/members/{memberId}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    membershipsHandler.HandlePut(),
		},
	}
}

func RegisterTeamsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/teams", basePath),
		openapi.WithOperationID("getTeams"),
		openapi.WithSummary("Get all teams"),
		openapi.WithDescription("Returns all teams for the authenticated user's organizations"),
		openapi.WithTags("Teams"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllTeamsResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/teams/members/{memberId}", basePath),
		openapi.WithOperationID("getTeamMemberships"),
		openapi.WithSummary("Get member's team memberships"),
		openapi.WithDescription("Returns the list of team IDs a member belongs to within an organization"),
		openapi.WithTags("Teams"),
		openapi.WithRequest(&types.MemberID{}),
		openapi.WithRequest(&types.GetTeamMembershipsRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetTeamMembershipsResponse{}),
	)

	svc.AddOperation(
		http.MethodPut,
		fmt.Sprintf("%s/teams/members/{memberId}", basePath),
		openapi.WithOperationID("updateTeamMemberships"),
		openapi.WithSummary("Update member's team memberships"),
		openapi.WithDescription("Sets which teams a member belongs to within an organization — computes the add/remove diff automatically"),
		openapi.WithTags("Teams"),
		openapi.WithRequest(&types.MemberID{}),
		openapi.WithRequest(&types.UpdateTeamMembershipsRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UpdateTeamMembershipsResponse{}),
	)
}
