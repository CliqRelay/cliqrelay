package routes

import (
	"github.com/CliqRelay/cliqrelay/openapi"
)

func RegisterAllOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	RegisterHealthOpenAPIDocs(svc, basePath)
	RegisterGuidesOpenAPIDocs(svc, basePath)
	RegisterStepsOpenAPIDocs(svc, basePath)
	RegisterUploadsOpenAPIDocs(svc, basePath)
}
