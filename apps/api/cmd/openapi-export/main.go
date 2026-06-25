package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/routes"
)

func main() {
	outputPath := flag.String("output", "openapi.json", "Path to write the OpenAPI spec file")
	format := flag.String("format", "json", "Output format: json or yaml")
	openAPIVersion := flag.String("openapi-version", "3.1.0", "OpenAPI spec version: 3.0.3 or 3.1.0")
	flag.Parse()

	envConfig := constants.LoadEnvConfig()

	svc, err := openapi.NewOpenAPIService(
		"CliqRelay API",
		envConfig.OpenAPISpecVersion,
		"CliqRelay API - step-by-step visual documentation platform",
		envConfig.BaseURL,
		openapi.WithOpenAPIVersion(*openAPIVersion),
		openapi.WithShortSchemaNames(),
	)
	if err != nil {
		log.Fatal("Error initializing OpenAPI service: ", err)
	}

	routes.RegisterAllOpenAPIDocs(svc, "/api/v1")

	var data []byte
	switch *format {
	case "yaml":
		data, err = svc.SpecYAML()
	case "json":
		data, err = svc.SpecJSON()
	default:
		log.Fatalf("Unsupported format: %s (use json or yaml)", *format)
	}
	if err != nil {
		log.Fatal("Error marshalling OpenAPI spec: ", err)
	}

	if err := os.WriteFile(*outputPath, data, 0644); err != nil {
		log.Fatal("Error writing OpenAPI spec: ", err)
	}

	fmt.Printf("OpenAPI spec written to %s (%s)\n", *outputPath, *format)
}
