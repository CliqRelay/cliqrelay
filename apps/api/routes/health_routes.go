package routes

import (
	"fmt"
	"net/http"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/health"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func HealthRoutes(appConfig *config.AppConfig) []authulamodels.Route {
	RegisterHealthOpenAPIDocs(appConfig.OpenAPIService, appConfig.BasePath)

	healthHandler := health.NewHealthHandler(appConfig)

	return []authulamodels.Route{
		{
			Method:  "GET",
			Path:    fmt.Sprintf("%s/health", appConfig.BasePath),
			Handler: healthHandler.Handler(),
		},
	}
}

func RegisterHealthOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/health", basePath),
		openapi.WithOperationID("getHealth"),
		openapi.WithSummary("Health check"),
		openapi.WithDescription("Returns the health status of the API"),
		openapi.WithTags("Health"),
		openapi.WithResponseStatus(http.StatusOK, &types.HealthResponse{}),
	)
}
