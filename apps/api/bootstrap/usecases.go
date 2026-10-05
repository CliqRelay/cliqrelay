package bootstrap

import (
	"errors"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"

	"github.com/CliqRelay/cliqrelay/interfaces"
	authservice "github.com/CliqRelay/cliqrelay/services/auth"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func buildUseCases(o *options, svcs *builtServices) (*interfaces.DomainUseCases, interfaces.AuthorizationService, error) {
	if o.authulaInstance == nil {
		return nil, nil, errors.New("bootstrap: WithAuthula is required")
	}

	orgPlugin, ok := o.authulaInstance.PluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizationsplugin.OrganizationsPlugin)
	if !ok {
		return nil, nil, errors.New("bootstrap: organizations plugin not found")
	}

	authorizationService := o.authorizationService
	if authorizationService == nil {
		authorizationService = authservice.NewDefaultAuthorizationService(*orgPlugin.Api, svcs.Domain.TeamsService)
	}

	guidesUseCase := usecases.NewGuidesUseCase(authorizationService, svcs.Domain.GuidesService, svcs.Domain.StarredGuidesService, svcs.Domain.ExportService)
	stepsUseCase := usecases.NewStepsUseCase(authorizationService, svcs.Domain.StepsService, svcs.Domain.GuidesService)
	mediaAssetsUseCase := usecases.NewMediaAssetsUseCase(authorizationService, svcs.Domain.MediaAssetsService, svcs.Domain.StepsService, svcs.Domain.GuidesService)
	organizationsUseCase := usecases.NewOrganizationsUseCase(orgPlugin.Api)
	teamsUseCase := usecases.NewTeamsUseCase(svcs.Domain.TeamsService)
	uploadsUseCase := usecases.NewUploadsUseCase(authorizationService, svcs.Domain.UploadsService, svcs.Domain.GuidesService, svcs.Domain.StepsService)

	return &interfaces.DomainUseCases{
		GuidesUseCase:        guidesUseCase,
		StepsUseCase:         stepsUseCase,
		MediaAssetsUseCase:   mediaAssetsUseCase,
		UploadsUseCase:       uploadsUseCase,
		OrganizationsUseCase: organizationsUseCase,
		TeamsUseCase:         teamsUseCase,
	}, authorizationService, nil
}
