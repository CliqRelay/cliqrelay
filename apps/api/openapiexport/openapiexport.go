package openapiexport

import (
	"fmt"
	"os"

	"github.com/CliqRelay/cliqrelay/constants"
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

func ExportSpecToFile(outputPath, format string, extraDocs []routes.OpenAPIDocFunc) error {
	return ExportSpecToFileWithVersion(outputPath, format, "3.1.0", extraDocs)
}

func ExportSpecToFileWithVersion(outputPath, format, openAPIVersion string, extraDocs []routes.OpenAPIDocFunc) error {
	if format != "json" && format != "yaml" {
		return fmt.Errorf("unsupported format: %s (use json or yaml)", format)
	}

	envConfig := constants.LoadEnvConfig()

	svc, err := GenerateService(
		"CliqRelay API",
		envConfig.OpenAPISpecVersion,
		"CliqRelay API - step-by-step visual documentation platform",
		envConfig.BaseURL,
		"/api/v1",
		extraDocs,
		openapi.WithOpenAPIVersion(openAPIVersion),
		openapi.WithShortSchemaNames(),
	)
	if err != nil {
		return fmt.Errorf("initializing OpenAPI service: %w", err)
	}

	var data []byte
	switch format {
	case "yaml":
		data, err = svc.SpecYAML()
	case "json":
		data, err = svc.SpecJSON()
	}
	if err != nil {
		return fmt.Errorf("marshalling OpenAPI spec: %w", err)
	}

	if err := os.WriteFile(outputPath, data, 0644); err != nil {
		return fmt.Errorf("writing OpenAPI spec: %w", err)
	}

	return nil
}
