package auth

import (
	"context"
	"fmt"

	authulamodels "github.com/Authula/authula/models"
	accesscontrolplugin "github.com/Authula/authula/plugins/access-control"
	accesscontrolplugintypes "github.com/Authula/authula/plugins/access-control/types"
)

func assignRoleToUserIfMissing(
	ctx context.Context,
	acPlugin *accesscontrolplugin.AccessControlPlugin,
	actor *authulamodels.Actor,
	userID string,
	roleName string,
) error {
	if roleName == "" {
		return nil
	}

	existingRoles, err := acPlugin.Api.GetUserRoles(ctx, actor, userID)
	if err != nil {
		return fmt.Errorf("failed to get roles for user %s: %w", userID, err)
	}
	for _, existing := range existingRoles {
		if existing.RoleName == roleName {
			return nil
		}
	}

	role, err := acPlugin.Api.GetRoleByName(ctx, actor, roleName)
	if err != nil {
		return fmt.Errorf("failed to get role %q: %w", roleName, err)
	}
	if role == nil {
		return nil
	}

	return acPlugin.Api.AssignRoleToUser(ctx, actor, userID, accesscontrolplugintypes.AssignUserRoleRequest{
		RoleID: role.ID,
	}, nil)
}
