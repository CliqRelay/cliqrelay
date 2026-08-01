package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/Authula/authula"
	coreerrors "github.com/Authula/authula/core/errors"
	authulamodels "github.com/Authula/authula/models"
	accesscontrolplugin "github.com/Authula/authula/plugins/access-control"
	accesscontrolplugintypes "github.com/Authula/authula/plugins/access-control/types"
	orgconstants "github.com/Authula/authula/plugins/organizations/constants"

	"github.com/CliqRelay/cliqrelay/constants"
)

type guidePermissionDef struct {
	Key         string
	Description string
}

var guidePermissions = []guidePermissionDef{
	{Key: constants.GuidesReadPermission, Description: "Read guides"},
	{Key: constants.GuidesCreatePermission, Description: "Create guides"},
	{Key: constants.GuidesEditPermission, Description: "Edit guides"},
	{Key: constants.GuidesDeletePermission, Description: "Delete guides"},
	{Key: constants.GuidesAllPermission, Description: "Full access to guides"},
}

func SeedRolesAndPermissions(ctx context.Context, authulaAuth *authula.Auth) error {
	acPlugin, ok := authulaAuth.PluginRegistry.GetPlugin(authulamodels.PluginAccessControl.String()).(*accesscontrolplugin.AccessControlPlugin)
	if !ok {
		return fmt.Errorf("access control plugin not found")
	}

	systemActor := &authulamodels.Actor{
		ID:     "system",
		Type:   authulamodels.ActorMachine,
		Scopes: []string{"*"},
	}

	for _, gp := range guidePermissions {
		desc := gp.Description
		perm, err := acPlugin.Api.GetPermissionByKey(ctx, systemActor, gp.Key)
		if err != nil && !errors.Is(err, coreerrors.ErrNotFound) {
			return fmt.Errorf("failed to check permission %q: %w", gp.Key, err)
		}

		if perm == nil {
			if _, err := acPlugin.Api.CreatePermission(ctx, systemActor, accesscontrolplugintypes.CreatePermissionRequest{
				Key:         gp.Key,
				Description: &desc,
				IsSystem:    false,
			}); err != nil {
				return fmt.Errorf("failed to create permission %q: %w", gp.Key, err)
			}
		}
	}

	type roleDef struct {
		Name        string
		Description string
		Weight      int
		Permissions []string
	}

	orgRoles := []roleDef{
		{
			Name: "admin", Description: "Administrator with full access", Weight: 100,
			Permissions: []string{
				// Organizations
				orgconstants.All,

				// Guides
				constants.GuidesAllPermission,
			},
		},
		{
			Name: "editor", Description: "Editor with read and write access", Weight: 90,
			Permissions: []string{
				// Organizations
				orgconstants.OrganizationsReadPermission,
				orgconstants.OrganizationsInvitationsCreatePermission,
				orgconstants.OrganizationsInvitationsListPermission,
				orgconstants.OrganizationsInvitationsReadPermission,
				orgconstants.OrganizationsInvitationsRevokePermission,
				orgconstants.OrganizationsMembersAddPermission,
				orgconstants.OrganizationsMembersListPermission,
				orgconstants.OrganizationsMembersReadPermission,
				orgconstants.OrganizationsMembersUpdatePermission,
				orgconstants.OrganizationsTeamsCreatePermission,
				orgconstants.OrganizationsTeamsListPermission,
				orgconstants.OrganizationsTeamsReadPermission,
				orgconstants.OrganizationsTeamsUpdatePermission,
				orgconstants.OrganizationsTeamMembersAddPermission,
				orgconstants.OrganizationsTeamMembersListPermission,
				orgconstants.OrganizationsTeamMembersReadPermission,
				// Guides
				constants.GuidesReadPermission,
				constants.GuidesCreatePermission,
				constants.GuidesEditPermission,
			},
		},
		{
			Name: "viewer", Description: "Viewer with read-only access", Weight: 80,
			Permissions: []string{
				// Organizations
				orgconstants.OrganizationsReadPermission,
				orgconstants.OrganizationsInvitationsListPermission,
				orgconstants.OrganizationsInvitationsReadPermission,
				orgconstants.OrganizationsMembersListPermission,
				orgconstants.OrganizationsMembersReadPermission,
				orgconstants.OrganizationsTeamsListPermission,
				orgconstants.OrganizationsTeamsReadPermission,
				orgconstants.OrganizationsTeamMembersListPermission,
				orgconstants.OrganizationsTeamMembersReadPermission,
				// Guides
				constants.GuidesReadPermission,
			},
		},
	}

	for _, r := range orgRoles {
		role, err := acPlugin.Api.GetRoleByName(ctx, systemActor, r.Name)
		if err != nil && !errors.Is(err, coreerrors.ErrNotFound) {
			return fmt.Errorf("failed to check role %q: %w", r.Name, err)
		}

		if role == nil {
			desc := r.Description
			role, err = acPlugin.Api.CreateRole(ctx, systemActor, accesscontrolplugintypes.CreateRoleRequest{
				Name:        r.Name,
				Description: &desc,
				Weight:      &r.Weight,
				IsSystem:    false,
			})
			if err != nil {
				return fmt.Errorf("failed to create role %q: %w", r.Name, err)
			}
		}

		permissionIDs := make([]string, 0, len(r.Permissions))
		for _, key := range r.Permissions {
			perm, err := acPlugin.Api.GetPermissionByKey(ctx, systemActor, key)
			if err != nil {
				return fmt.Errorf("failed to look up permission %q for role %q: %w", key, r.Name, err)
			}
			if perm == nil {
				return fmt.Errorf("permission %q not found for role %q", key, r.Name)
			}
			permissionIDs = append(permissionIDs, perm.ID)
		}

		if err := acPlugin.Api.ReplaceRolePermissions(ctx, systemActor, role.ID, permissionIDs, nil); err != nil {
			return fmt.Errorf("failed to assign permissions to role %q: %w", r.Name, err)
		}
	}

	return nil
}
