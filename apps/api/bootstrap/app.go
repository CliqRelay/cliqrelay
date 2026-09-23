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
	"github.com/CliqRelay/cliqrelay/routes"
	activitylogsservice "github.com/CliqRelay/cliqrelay/services/activity_logs"
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
	RawRoutes            []routes.RawRoute
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

	// Registered here and not in NewWorker so the hooks are attached exactly once.
	if o.guideHooks == nil {
		o.guideHooks = &interfaces.GuideHooks{}
	}
	activitylogsservice.RegisterGuideHooks(o.guideHooks, o.infraCfg.RedisClient, repos.Guides, o.infraCfg.Logger)

	svcs := buildServices(o, repos)

	useCases, authorizationService, err := buildUseCases(o, svcs)
	if err != nil {
		return nil, err
	}

	routesArr, err := buildRoutes(o, useCases, svcs)
	if err != nil {
		return nil, err
	}

	httpConfig := &config.HTTPConfig{
		AuthulaInstance: o.authulaInstance,
		OpenAPIService:  o.openAPIService,
		BasePath:        o.basePath,
	}

	return &Application{
		EnvConfig:            o.envConfig,
		Authula:              o.authulaInstance,
		HTTPConfig:           httpConfig,
		UseCases:             useCases,
		Services:             svcs.Domain,
		Repositories:         repos,
		AuthorizationService: authorizationService,
		Routes:               routesArr,
		RawRoutes:            routes.RealtimeRawRoutes(httpConfig, useCases.RealtimeUseCase, clientURL(o.envConfig)),
	}, nil
}

func (a *Application) RegisterRoutes(routes ...authulamodels.Route) {
	if len(routes) == 0 {
		return
	}
	a.Authula.RegisterCustomRoutes(routes)
	a.Routes = append(a.Routes, routes...)
}

// RegisterRawRoutes adds routes served in front of Authula; see RawRoute.
func (a *Application) RegisterRawRoutes(rawRoutes ...routes.RawRoute) {
	a.RawRoutes = append(a.RawRoutes, rawRoutes...)
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
	return http.ListenAndServe(fmt.Sprintf(":%s", port), a.Handler())
}

// Handler serves the raw routes directly and hands everything else to Authula.
func (a *Application) Handler() http.Handler {
	mux := http.NewServeMux()
	for _, route := range a.RawRoutes {
		mux.Handle(route.Pattern(), route.Handler)
	}
	mux.Handle("/", a.Authula.Handler())
	return mux
}

func clientURL(cfg *constants.EnvConfig) string {
	if cfg == nil {
		return ""
	}
	return cfg.ClientURL
}
