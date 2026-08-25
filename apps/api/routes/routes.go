package routes

import (
	"fmt"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
)

func InitRoutes(cfg *config.HTTPConfig, useCases *interfaces.DomainUseCases, services *interfaces.DomainServices, extraRoutes ...[]authulamodels.Route) []authulamodels.Route {
	routes := []authulamodels.Route{}
	routes = append(routes, HealthRoutes(cfg)...)
	routes = append(routes, TeamsRoutes(cfg, useCases.TeamsUseCase)...)
	routes = append(routes, GuidesRoutes(cfg, useCases.GuidesUseCase, useCases.GuideViewsUseCase)...)
	routes = append(routes, StepsRoutes(cfg, useCases.StepsUseCase)...)
	routes = append(routes, MediaAssetsRoutes(cfg, useCases.MediaAssetsUseCase)...)
	routes = append(routes, UploadRoutes(cfg, useCases.UploadsUseCase)...)

	for _, extra := range extraRoutes {
		routes = append(routes, extra...)
	}

	routes = append(routes, authulamodels.Route{
		Method:  "GET",
		Path:    fmt.Sprintf("%s/openapi.json", cfg.BasePath),
		Handler: openapi.NewOpenAPISpecHandler(cfg.OpenAPIService),
	})

	for _, route := range routes {
		cfg.AuthulaInstance.RegisterCustomRoute(route)
	}

	return routes
}
