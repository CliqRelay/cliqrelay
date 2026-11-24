package openapi_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/openapi"
)

func TestOpenAPIVersion(t *testing.T) {
	t.Parallel()

	type HealthResponse struct {
		Status string `json:"status"`
	}
	type operationCase struct {
		method  string
		path    string
		options []openapi.OperationOption
	}

	cases := []struct {
		name               string
		options            []openapi.ServiceOption
		operation          *operationCase
		wantOpenAPIVersion string
		wantPaths          []string
		wantSchemas        []string
	}{
		{
			name:               "defaults to 3.0.3",
			wantOpenAPIVersion: "3.0.3",
		},
		{
			name:    "explicit 3.0.3",
			options: []openapi.ServiceOption{openapi.WithOpenAPIVersion("3.0.3")},
			operation: &operationCase{
				method: http.MethodGet,
				path:   "/api/v1/test",
				options: []openapi.OperationOption{
					openapi.WithResponseStatus(http.StatusOK, &struct {
						Message string `json:"message"`
					}{}),
				},
			},
			wantOpenAPIVersion: "3.0.3",
			wantPaths:          []string{"/api/v1/test"},
		},
		{
			name: "3.1.0 spec version and basic operation",
			options: []openapi.ServiceOption{
				openapi.WithOpenAPIVersion("3.1.0"),
				openapi.WithShortSchemaNames(),
			},
			operation: &operationCase{
				method: http.MethodGet,
				path:   "/api/v1/health",
				options: []openapi.OperationOption{
					openapi.WithSummary("Health"),
					openapi.WithResponseStatus(http.StatusOK, &HealthResponse{}),
				},
			},
			wantOpenAPIVersion: "3.1.0",
			wantPaths:          []string{"/api/v1/health"},
			wantSchemas:        []string{"HealthResponse"},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test", "1.0.0", "", "http://localhost:8080", tt.options...)
			require.NoError(t, err)

			if tt.operation != nil {
				err = svc.AddOperation(tt.operation.method, tt.operation.path, tt.operation.options...)
				require.NoError(t, err)
			}

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)
			assert.Equal(t, tt.wantOpenAPIVersion, result["openapi"])

			if len(tt.wantPaths) > 0 {
				paths, ok := result["paths"].(map[string]any)
				require.True(t, ok)
				for _, path := range tt.wantPaths {
					assert.Contains(t, paths, path)
				}
			}

			if len(tt.wantSchemas) > 0 {
				schemas := result["components"].(map[string]any)["schemas"].(map[string]any)
				for _, schema := range tt.wantSchemas {
					assert.Contains(t, schemas, schema)
				}
			}
		})
	}
}
