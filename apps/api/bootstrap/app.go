package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/Authula/authula"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/migrations"
)

type Application struct {
	EnvConfig            *constants.EnvConfig
	Authula              *authula.Auth
	HTTPConfig           *config.HTTPConfig
	UseCases             *interfaces.DomainUseCases
	Services             *interfaces.DomainServices
	Repositories         *interfaces.Repositories
	AuthorizationService interfaces.AuthorizationService
	Routes               []authulamodels.Route
}

func New(opts ...Option) (*Application, error) {
	o := defaultOptions()
	o.apply(opts...)

	if o.authulaInstance == nil {
		return nil, errors.New("bootstrap: WithAuthula is required")
	}
	if o.infraCfg == nil {
		return nil, errors.New("bootstrap: WithInfra is required")
	}
	if o.openAPIService == nil {
		return nil, errors.New("bootstrap: WithOpenAPIService is required")
	}

	repos, err := buildRepositories(o)
	if err != nil {
		return nil, err
	}

	svcs := buildServices(o, repos)

	useCases, authorizationService, err := buildUseCases(o, svcs)
	if err != nil {
		return nil, err
	}

	routesArr, err := buildRoutes(o, useCases, svcs)
	if err != nil {
		return nil, err
	}

	return &Application{
		EnvConfig: o.envConfig,
		Authula:   o.authulaInstance,
		HTTPConfig: &config.HTTPConfig{
			AuthulaInstance: o.authulaInstance,
			OpenAPIService:  o.openAPIService,
			BasePath:        o.basePath,
		},
		UseCases:             useCases,
		Services:             svcs.Domain,
		Repositories:         repos,
		AuthorizationService: authorizationService,
		Routes:               routesArr,
	}, nil
}

func (a *Application) RegisterRoutes(routes ...authulamodels.Route) {
	if len(routes) == 0 {
		return
	}
	a.Authula.RegisterCustomRoutes(routes)
	a.Routes = append(a.Routes, routes...)
}

func (a *Application) Migrate(ctx context.Context, opts ...migrations.Option) error {
	return migrations.RunMigrations(ctx, a.Authula, opts...)
}

func (a *Application) Run() error {
	port := "8080"
	if a.EnvConfig != nil && a.EnvConfig.Port != "" {
		port = a.EnvConfig.Port
	}

	slog.Debug(fmt.Sprintf("Server running on http://localhost:%s", port))
	return http.ListenAndServe(fmt.Sprintf(":%s", port), a.Authula.Handler())
}
