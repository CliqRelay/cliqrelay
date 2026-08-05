package auth

import (
	"context"
	"fmt"

	authulamodels "github.com/Authula/authula/models"
	organizations "github.com/Authula/authula/plugins/organizations"
	organizationsplugintypes "github.com/Authula/authula/plugins/organizations/types"
)

func ConstructOrganizationsServiceHooks() organizationsplugintypes.OrganizationsServiceHooksConfig {
	organizationHooks := &organizationsplugintypes.OrganizationServiceHooks{}
	organizationHooks.RegisterAfterCreate(createDefaultTeamAndAssignAdminRole)

	memberHooks := &organizationsplugintypes.OrganizationMemberServiceHooks{}
	memberHooks.RegisterBeforeDelete(preventOwnerAndSelfRemoval)

	return organizationsplugintypes.OrganizationsServiceHooksConfig{
		Organizations: organizationHooks,
		Members:       memberHooks,
	}
}

func createDefaultTeamAndAssignAdminRole(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error {
	if actor.Type != authulamodels.ActorUser {
		return nil
	}

	pluginRegistry := authulamodels.GetPluginRegistryFromContext(ctx)
	if pluginRegistry == nil {
		return fmt.Errorf("plugin registry not available in context")
	}

	organizationsPlugin, ok := pluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizations.OrganizationsPlugin)
	if !ok {
		return fmt.Errorf("organizations plugin not found")
	}

	systemActor := &authulamodels.Actor{
		ID:     actor.ID,
		Type:   authulamodels.ActorMachine,
		Scopes: []string{"*"},
	}

	_, err := organizationsPlugin.Api.CreateTeam(ctx, systemActor, organization.ID, organizationsplugintypes.CreateOrganizationTeamRequest{
		Name: "My Team",
	})
	if err != nil {
		return fmt.Errorf("failed to create team: %w", err)
	}

	return nil
}

func preventOwnerAndSelfRemoval(ctx context.Context, actor *authulamodels.Actor, member *organizationsplugintypes.OrganizationMember) error {
	pluginRegistry := authulamodels.GetPluginRegistryFromContext(ctx)
	if pluginRegistry == nil {
		return fmt.Errorf("plugin registry not available in context")
	}

	orgPlugin, ok := pluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizations.OrganizationsPlugin)
	if !ok {
		return fmt.Errorf("%s plugin not found", authulamodels.PluginOrganizations.String())
	}

	org, err := orgPlugin.Api.GetOrganizationByID(ctx, actor, member.OrganizationID)
	if err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	if member.UserID == org.OwnerID {
		return fmt.Errorf("cannot remove the organization owner")
	}

	if actor.ID == member.UserID {
		return fmt.Errorf("cannot remove yourself from the organization")
	}

	return nil
}
