package openapiexport

import (
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/routes"
)

func GenerateService(title, apiVersion, description, serverURL, basePath string, extraDocs []routes.OpenAPIDocFunc, opts ...openapi.ServiceOption) (openapi.OpenAPIService, error) {
	service, err := openapi.NewOpenAPIService(title, apiVersion, description, serverURL, opts...)
	if err != nil {
		return nil, err
	}
	routes.RegisterAllOpenAPIDocs(service, basePath, extraDocs...)
	return service, nil
}
