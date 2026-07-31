package bootstrap

import (
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/routes"
)

func buildRoutes(o *options, useCases *interfaces.DomainUseCases, svcs *builtServices) ([]authulamodels.Route, error) {
	httpConfig := &config.HTTPConfig{
		AuthulaInstance: o.authulaInstance,
		OpenAPIService:  o.openAPIService,
		BasePath:        o.basePath,
	}

	return routes.InitRoutes(httpConfig, useCases, svcs.Domain, o.extraRoutes), nil
}
