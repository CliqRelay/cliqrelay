package routes

import (
	"fmt"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
)

func InitRoutes(appConfig *config.AppConfig, svcs *interfaces.DomainUseCases, extraRoutes ...[]authulamodels.Route) []authulamodels.Route {
	routes := []authulamodels.Route{}
	routes = append(routes, HealthRoutes(appConfig)...)
	routes = append(routes, WorkspacesRoutes(appConfig, svcs.WorkspaceService)...)
	routes = append(routes, GuidesRoutes(appConfig, svcs.GuidesUseCase, svcs.ExportService)...)
	routes = append(routes, StepsRoutes(appConfig, svcs.StepsUseCase)...)
	routes = append(routes, MediaAssetsRoutes(appConfig, svcs.MediaAssetsUseCase)...)
	routes = append(routes, UploadRoutes(appConfig, svcs.UploadsUseCase)...)

	for _, extra := range extraRoutes {
		routes = append(routes, extra...)
	}

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
