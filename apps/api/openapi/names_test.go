package openapi_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/openapi"
)

func TestShortSchemaNames(t *testing.T) {
	t.Parallel()

	type HealthResponse struct {
		Status string `json:"status"`
	}
	type MyResponse struct {
		Message string `json:"message"`
	}

	cases := []struct {
		name              string
		options           []openapi.ServiceOption
		path              string
		response          any
		wantSchemas       []string
		wantAbsentSchemas []string
	}{
		{
			name:        "schema name is just the struct name without package prefix",
			options:     []openapi.ServiceOption{openapi.WithShortSchemaNames()},
			path:        "/api/v1/health",
			response:    &HealthResponse{},
			wantSchemas: []string{"HealthResponse"},
			wantAbsentSchemas: []string{
				"TypesHealthResponse",
				"OpenapiTestHealthResponse",
			},
		},
		{
			name:        "default (no option) still uses package-prefixed names",
			path:        "/api/v1/test",
			response:    &MyResponse{},
			wantSchemas: []string{"OpenapiTestMyResponse"},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test", "1.0.0", "", "http://localhost:8080", tt.options...)
			require.NoError(t, err)

			err = svc.AddOperation(
				http.MethodGet,
				tt.path,
				openapi.WithResponseStatus(http.StatusOK, tt.response),
			)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			schemas := result["components"].(map[string]any)["schemas"].(map[string]any)

			for _, name := range tt.wantSchemas {
				assert.Contains(t, schemas, name)
			}
			for _, name := range tt.wantAbsentSchemas {
				assert.NotContains(t, schemas, name)
			}
		})
	}
}

func TestRegisterSchema(t *testing.T) {
	t.Parallel()

	type MyType struct {
		ID string `json:"id"`
	}

	cases := []struct {
		name       string
		schemaName string
		typ        any
	}{
		{
			name:       "registers a type under a custom schema name",
			schemaName: "CustomName",
			typ:        &MyType{},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.RegisterSchema(tt.schemaName, tt.typ)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			schemas := result["components"].(map[string]any)["schemas"].(map[string]any)
			assert.Contains(t, schemas, tt.schemaName)
		})
	}
}
