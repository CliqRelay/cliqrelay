package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/CliqRelay/cliqrelay/openapiexport"
)

func main() {
	outputPath := flag.String("output", "openapi.json", "Path to write the OpenAPI spec file")
	format := flag.String("format", "json", "Output format: json or yaml")
	flag.Parse()

	if err := openapiexport.ExportSpecToFile(*outputPath, *format, nil); err != nil {
		log.Fatal("Error exporting OpenAPI spec: ", err)
	}

	fmt.Printf("OpenAPI spec written to %s (%s)\n", *outputPath, *format)
}
