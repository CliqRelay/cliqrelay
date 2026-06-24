package routes

import (
	"fmt"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/openapi"
)

func InitRoutes(appConfig *internal.AppConfig) []authulamodels.Route {
	routes := []authulamodels.Route{}
	routes = append(routes, HealthRoutes(appConfig)...)
	routes = append(routes, GuidesRoutes(appConfig)...)
	routes = append(routes, StepsRoutes(appConfig)...)
	routes = append(routes, MediaAssetsRoutes(appConfig)...)
	routes = append(routes, UploadRoutes(appConfig)...)

	routes = append(routes, authulamodels.Route{
		Method:  "GET",
		Path:    fmt.Sprintf("%s/openapi.json", appConfig.BasePath),
		Handler: openapi.NewOpenAPISpecHandler(appConfig.OpenAPIService),
	})

	for _, route := range routes {
		appConfig.AuthulaInstance.RegisterCustomRoute(route)
	}

	return routes
}
