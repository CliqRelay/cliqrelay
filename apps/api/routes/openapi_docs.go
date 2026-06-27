package routes

import (
	"github.com/CliqRelay/cliqrelay/openapi"
)

type OpenAPIDocFunc func(svc openapi.OpenAPIService, basePath string)

func RegisterAllOpenAPIDocs(svc openapi.OpenAPIService, basePath string, extra ...OpenAPIDocFunc) {
	RegisterHealthOpenAPIDocs(svc, basePath)
	RegisterGuidesOpenAPIDocs(svc, basePath)
	RegisterStepsOpenAPIDocs(svc, basePath)
	RegisterMediaAssetsOpenAPIDocs(svc, basePath)
	RegisterUploadsOpenAPIDocs(svc, basePath)
	for _, fn := range extra {
		fn(svc, basePath)
	}
}
