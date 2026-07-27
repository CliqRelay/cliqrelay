package auth

import (
	"context"
	"fmt"

	authulamodels "github.com/Authula/authula/models"
	accesscontrol "github.com/Authula/authula/plugins/access-control"
	accesscontroltypes "github.com/Authula/authula/plugins/access-control/types"
	organizations "github.com/Authula/authula/plugins/organizations"
	organizationsplugintypes "github.com/Authula/authula/plugins/organizations/types"
)

func ConstructOrganizationsServiceHooks(provider authulaProvider) organizationsplugintypes.OrganizationsServiceHooksConfig {
	return organizationsplugintypes.OrganizationsServiceHooksConfig{
		Organizations: &organizationsplugintypes.OrganizationServiceHooksConfig{
			AfterCreate: func(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error {
				if actor.Type != authulamodels.ActorUser {
					return nil
				}

				authulaInstance := provider()
				if authulaInstance == nil {
					return fmt.Errorf("authula instance not initialized")
				}

				organizationsPlugin, ok := authulaInstance.PluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizations.OrganizationsPlugin)
				if !ok {
					return fmt.Errorf("organizations plugin not found")
				}

				accessControlPlugin, ok := authulaInstance.PluginRegistry.GetPlugin(authulamodels.PluginAccessControl.String()).(*accesscontrol.AccessControlPlugin)
				if !ok {
					return fmt.Errorf("access control plugin not found")
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

				adminRole, err := accessControlPlugin.Api.GetRoleByName(ctx, systemActor, "admin")
				if err != nil {
					return fmt.Errorf("failed to get admin role: %w", err)
				}

				if err := accessControlPlugin.Api.AssignRoleToUser(ctx, systemActor, actor.ID, accesscontroltypes.AssignUserRoleRequest{
					RoleID: adminRole.ID,
				}, nil); err != nil {
					return fmt.Errorf("failed to assign admin role to user: %w", err)
				}

				return nil
			},
		},
		Members: &organizationsplugintypes.OrganizationMemberServiceHooksConfig{
			BeforeDelete: func(ctx context.Context, actor *authulamodels.Actor, member *organizationsplugintypes.OrganizationMember) error {
				authulaInstance := provider()
				if authulaInstance == nil {
					return fmt.Errorf("authula instance not initialized")
				}

				orgPlugin, ok := authulaInstance.PluginRegistry.GetPlugin(authulamodels.PluginOrganizations.String()).(*organizations.OrganizationsPlugin)
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
			},
		},
	}
}
