package auth

import (
	"context"
	"fmt"
	"log/slog"

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

				orgPlugin, ok := authulaInstance.PluginRegistry.GetPlugin("organizations").(*organizations.OrganizationsPlugin)
				if !ok {
					return fmt.Errorf("organizations plugin not found")
				}

				acPlugin, ok := authulaInstance.PluginRegistry.GetPlugin("access_control").(*accesscontrol.AccessControlPlugin)
				if !ok {
					return fmt.Errorf("access control plugin not found")
				}

			systemActor := &authulamodels.Actor{
					ID:     actor.ID,
					Type:   authulamodels.ActorMachine,
					Scopes: []string{"*"},
				}

				team, err := orgPlugin.Api.CreateTeam(ctx, systemActor, organization.ID, organizationsplugintypes.CreateOrganizationTeamRequest{
					Name: "My Team",
				})
				if err != nil {
					return fmt.Errorf("failed to create team: %w", err)
				}

				slog.Debug("Created team for organization", "org_id", organization.ID, "team_id", team.ID)

				adminRole, err := acPlugin.Api.GetRoleByName(ctx, systemActor, "admin")
				if err != nil {
					return fmt.Errorf("failed to get admin role: %w", err)
				}

				if err := acPlugin.Api.AssignRoleToUser(ctx, systemActor, actor.ID, accesscontroltypes.AssignUserRoleRequest{
					RoleID: adminRole.ID,
				}, nil); err != nil {
					return fmt.Errorf("failed to assign admin role to user: %w", err)
				}

				slog.Debug("Assigned admin role to user", "user_id", actor.ID, "role_id", adminRole.ID)

				return nil
			},
		},
	}
}
