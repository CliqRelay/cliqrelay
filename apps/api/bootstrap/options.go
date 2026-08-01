package bootstrap

import (
	"errors"

	"github.com/Authula/authula"
	authulamodels "github.com/Authula/authula/models"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/infra"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
)

type Option func(*options)

type options struct {
	envConfig       *constants.EnvConfig
	infraCfg        *infra.Infrastructure
	db              bun.IDB
	authulaInstance *authula.Auth
	openAPIService  openapi.OpenAPIService
	basePath        string

	guidesRepo        interfaces.GuidesRepository
	starredGuidesRepo interfaces.StarredGuidesRepository
	stepsRepo         interfaces.StepsRepository
	mediaAssetsRepo   interfaces.MediaAssetsRepository
	guideExportsRepo  interfaces.GuideExportsRepository
	guideViewsRepo    interfaces.GuideViewsRepository

	guideHooks *interfaces.GuideHooks
	stepHooks  *interfaces.StepHooks
	mediaHooks *interfaces.MediaAssetHooks

	authorizationService interfaces.AuthorizationService

	extraRoutes []authulamodels.Route

	consumerGroup string
	concurrency   int
	enableCron    bool
}

func defaultOptions() *options {
	return &options{
		basePath:      "/api/v1",
		consumerGroup: "cliqrelay-consumer-group",
		concurrency:   5,
		enableCron:    true,
	}
}

func (o *options) apply(opts ...Option) {
	for _, opt := range opts {
		if opt != nil {
			opt(o)
		}
	}
}

func (o *options) dbOrAuthulaDB() (bun.IDB, error) {
	if o.db != nil {
		return o.db, nil
	}
	if o.authulaInstance != nil {
		return o.authulaInstance.DB(), nil
	}
	return nil, errors.New("no database configured (use WithDB or WithAuthula)")
}

func WithEnvConfig(cfg *constants.EnvConfig) Option {
	return func(o *options) { o.envConfig = cfg }
}

func WithInfra(cfg *infra.Infrastructure) Option {
	return func(o *options) { o.infraCfg = cfg }
}

func WithDB(db bun.IDB) Option {
	return func(o *options) { o.db = db }
}

func WithAuthula(auth *authula.Auth) Option {
	return func(o *options) { o.authulaInstance = auth }
}

func WithOpenAPIService(svc openapi.OpenAPIService) Option {
	return func(o *options) { o.openAPIService = svc }
}

func WithBasePath(path string) Option {
	return func(o *options) { o.basePath = path }
}

func WithGuidesRepository(repo interfaces.GuidesRepository) Option {
	return func(o *options) { o.guidesRepo = repo }
}

func WithStarredGuidesRepository(repo interfaces.StarredGuidesRepository) Option {
	return func(o *options) { o.starredGuidesRepo = repo }
}

func WithStepsRepository(repo interfaces.StepsRepository) Option {
	return func(o *options) { o.stepsRepo = repo }
}

func WithMediaAssetsRepository(repo interfaces.MediaAssetsRepository) Option {
	return func(o *options) { o.mediaAssetsRepo = repo }
}

func WithGuideExportsRepository(repo interfaces.GuideExportsRepository) Option {
	return func(o *options) { o.guideExportsRepo = repo }
}

func WithGuideViewsRepository(repo interfaces.GuideViewsRepository) Option {
	return func(o *options) { o.guideViewsRepo = repo }
}

func WithGuideHooks(hooks *interfaces.GuideHooks) Option {
	return func(o *options) { o.guideHooks = hooks }
}

func WithStepsHooks(hooks *interfaces.StepHooks) Option {
	return func(o *options) { o.stepHooks = hooks }
}

func WithMediaAssetHooks(hooks *interfaces.MediaAssetHooks) Option {
	return func(o *options) { o.mediaHooks = hooks }
}

func WithAuthorizationService(svc interfaces.AuthorizationService) Option {
	return func(o *options) { o.authorizationService = svc }
}

func WithExtraRoutes(routes ...authulamodels.Route) Option {
	return func(o *options) { o.extraRoutes = append(o.extraRoutes, routes...) }
}

func WithConsumerGroup(name string) Option {
	return func(o *options) { o.consumerGroup = name }
}

func WithConcurrency(n int) Option {
	return func(o *options) { o.concurrency = n }
}

func WithCron(enabled bool) Option {
	return func(o *options) { o.enableCron = enabled }
}
