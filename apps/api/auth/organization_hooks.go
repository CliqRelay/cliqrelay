package auth

import (
	"context"
	"fmt"
	"log/slog"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	organizationsplugintypes "github.com/Authula/authula/plugins/organizations/types"
	authulaservices "github.com/Authula/authula/services"
)

type OrganizationServiceAfterCreateHookFunc = func(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error

func ConstructOrganizationsServiceHooks() organizationsplugintypes.OrganizationsServiceHooksConfig {
	return organizationsplugintypes.OrganizationsServiceHooksConfig{
		Organizations: &organizationsplugintypes.OrganizationServiceHooksConfig{
			AfterCreate: func(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error {
				if actor.Type != authulamodels.ActorUser {
					return nil
				}

				foundUserService, userService := authulamodels.GetServiceFromContext[authulaservices.UserService](ctx, authulamodels.ServiceUser)
				if !foundUserService {
					return fmt.Errorf("%s not found", authulamodels.ServiceUser.String())
				}

				pluginRegistry := authulamodels.GetPluginRegistryFromContext(ctx)

				organizationPlugin, ok := pluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizationsplugin.OrganizationsPlugin)
				if !ok {
					return fmt.Errorf("Organizations plugin not found")
				}

				if err := CreatePersonalWorkspaceForNewUserHook(userService, *organizationPlugin.Api)(ctx, actor, organization); err != nil {
					return err
				}

				return nil
			},
		},
	}
}

func CreatePersonalWorkspaceForNewUserHook(userService authulaservices.UserService, organizationsApi organizationsplugin.API) OrganizationServiceAfterCreateHookFunc {
	return func(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error {
		user, err := userService.GetByID(ctx, actor.ID)
		if err != nil {
			return err
		}

		slog.Debug("User", "found user:", user.ID)

		return nil
	}
}
