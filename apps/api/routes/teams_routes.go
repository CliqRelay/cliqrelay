package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/teams"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func TeamsRoutes(appConfig *config.AppConfig) []authulamodels.Route {
	teamsHandler := teams.NewGetTeamsHandler(appConfig)

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
}
