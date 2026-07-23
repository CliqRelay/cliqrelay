package auth

import (
	"github.com/Authula/authula"
	"github.com/CliqRelay/cliqrelay/config"
)

type authulaProvider func() *authula.Auth

func InitAuthServiceHooks(provider authulaProvider) config.AuthServiceHooks {
	return config.AuthServiceHooks{
		OrganizationsServiceHooksConfig: ConstructOrganizationsServiceHooks(provider),
	}
}
