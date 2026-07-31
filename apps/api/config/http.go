package config

import (
	"github.com/Authula/authula"

	"github.com/CliqRelay/cliqrelay/openapi"
)

type HTTPConfig struct {
	AuthulaInstance *authula.Auth
	OpenAPIService  openapi.OpenAPIService
	BasePath        string
}
