package auth

import (
	"context"
	"fmt"
	"log/slog"

	authulamodels "github.com/Authula/authula/models"
	organizationsplugintypes "github.com/Authula/authula/plugins/organizations/types"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type workspaceServiceProviderFactory func() interfaces.WorkspaceService

func ConstructOrganizationsServiceHooks(workspaceServiceProviderFactory workspaceServiceProviderFactory) organizationsplugintypes.OrganizationsServiceHooksConfig {
	return organizationsplugintypes.OrganizationsServiceHooksConfig{
		Organizations: &organizationsplugintypes.OrganizationServiceHooksConfig{
			AfterCreate: func(ctx context.Context, actor *authulamodels.Actor, organization *organizationsplugintypes.Organization) error {
				if actor.Type != authulamodels.ActorUser {
					return nil
				}

				workspaceService := workspaceServiceProviderFactory()
				if workspaceService == nil {
					return fmt.Errorf("workspace service not initialized")
				}

				personalType := models.WorkspaceTypePersonal
				existing, err := workspaceService.GetAll(ctx, actor, &types.WorkspaceFilter{Type: &personalType})
				if err != nil {
					return fmt.Errorf("failed to check existing workspaces: %w", err)
				}
				for _, workspace := range existing {
					if workspace.OrganizationID == organization.ID {
						slog.Debug("Personal workspace already exists for organization",
							"org_id", organization.ID,
							"workspace_id", workspace.ID,
						)
						return nil
					}
				}

				_, err = workspaceService.Create(ctx, actor, &types.CreateWorkspaceRequest{
					Name:           "Personal",
					Type:           personalType,
					OrganizationID: organization.ID,
				})
				if err != nil {
					return fmt.Errorf("failed to create personal workspace: %w", err)
				}

				return nil
			},
		},
	}
}
