package auth

import (
	"github.com/CliqRelay/cliqrelay/config"
)

func InitAuthServiceHooks() config.AuthServiceHooks {
	return config.AuthServiceHooks{
		OrganizationsServiceHooksConfig: ConstructOrganizationsServiceHooks(),
	}
}
