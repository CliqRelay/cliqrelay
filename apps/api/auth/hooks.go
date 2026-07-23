package auth

import (
	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

func InitAuthServiceHooks(provider func() interfaces.WorkspaceService) config.AuthServiceHooks {
	return config.AuthServiceHooks{
		OrganizationsServiceHooksConfig: ConstructOrganizationsServiceHooks(provider),
	}
}
