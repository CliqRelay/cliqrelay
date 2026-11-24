package openapi_test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/openapi"
)

func TestNewOpenAPIService(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name               string
		title              string
		apiVersion         string
		description        string
		serverURL          string
		wantOpenAPIVersion string
		wantInfo           map[string]any
		wantServers        []string
	}{
		{
			name:               "creates service with metadata",
			title:              "Test API",
			apiVersion:         "1.0.0",
			description:        "A test API",
			serverURL:          "http://localhost:8080",
			wantOpenAPIVersion: "3.0.3",
			wantInfo: map[string]any{
				"title":       "Test API",
				"version":     "1.0.0",
				"description": "A test API",
			},
			wantServers: []string{"http://localhost:8080"},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService(tt.title, tt.apiVersion, tt.description, tt.serverURL)
			require.NoError(t, err)
			require.NotNil(t, svc)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			assert.Equal(t, tt.wantOpenAPIVersion, result["openapi"])

			info, ok := result["info"].(map[string]any)
			require.True(t, ok)
			for key, want := range tt.wantInfo {
				assert.Equal(t, want, info[key])
			}

			servers, ok := result["servers"].([]any)
			require.True(t, ok)
			require.Len(t, servers, len(tt.wantServers))
			for i, want := range tt.wantServers {
				server := servers[i].(map[string]any)
				assert.Equal(t, want, server["url"])
			}
		})
	}
}

func TestOpenAPIService_AddOperation_Get(t *testing.T) {
	t.Parallel()

	type healthResponse struct {
		Status string `json:"status"`
	}
	type getGuideRequest struct {
		ID string `path:"id"`
	}
	type getGuideResponse struct {
		ID    string `json:"id"`
		Title string `json:"title"`
	}

	cases := []struct {
		name           string
		method         string
		path           string
		options        []openapi.OperationOption
		wantOperation  map[string]any
		wantPathParams []string
	}{
		{
			name:   "adds a GET operation with response",
			method: http.MethodGet,
			path:   "/api/v1/health",
			options: []openapi.OperationOption{
				openapi.WithSummary("Health check"),
				openapi.WithDescription("Returns the health status"),
				openapi.WithTags("System"),
				openapi.WithResponseStatus(http.StatusOK, &healthResponse{}),
			},
			wantOperation: map[string]any{
				"summary":     "Health check",
				"description": "Returns the health status",
				"tags":        []any{"System"},
			},
		},
		{
			name:   "adds operation with path parameters",
			method: http.MethodGet,
			path:   "/api/v1/guides/{id}",
			options: []openapi.OperationOption{
				openapi.WithSummary("Get guide by ID"),
				openapi.WithTags("Guides"),
				openapi.WithRequest(&getGuideRequest{}),
				openapi.WithResponseStatus(http.StatusOK, &getGuideResponse{}),
			},
			wantOperation: map[string]any{
				"summary": "Get guide by ID",
				"tags":    []any{"Guides"},
			},
			wantPathParams: []string{"id"},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(tt.method, tt.path, tt.options...)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			paths, ok := result["paths"].(map[string]any)
			require.True(t, ok, "spec should contain paths")

			pathItem, ok := paths[tt.path].(map[string]any)
			require.True(t, ok, "paths should contain %s", tt.path)

			op, ok := pathItem[strings.ToLower(tt.method)].(map[string]any)
			require.True(t, ok, "path should contain %s operation", strings.ToLower(tt.method))

			for key, want := range tt.wantOperation {
				assert.Equal(t, want, op[key], "unexpected %s", key)
			}

			if len(tt.wantPathParams) > 0 {
				params, ok := op["parameters"].([]any)
				require.True(t, ok, "path params should be extracted from struct tags")

				for _, name := range tt.wantPathParams {
					found := false
					for _, p := range params {
						param := p.(map[string]any)
						if param["name"] == name && param["in"] == "path" {
							found = true
							assert.Equal(t, true, param["required"])
						}
					}
					assert.True(t, found, "path parameter %q should be present", name)
				}
			}
		})
	}
}

func TestOpenAPIService_AddOperation_Post(t *testing.T) {
	t.Parallel()

	type createGuideRequest struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	type createGuideResponse struct {
		ID    string `json:"id"`
		Title string `json:"title"`
	}

	cases := []struct {
		name                string
		method              string
		path                string
		options             []openapi.OperationOption
		wantRequestBody     bool
		wantSchemasNonEmpty bool
	}{
		{
			name:   "adds a POST operation with request body",
			method: http.MethodPost,
			path:   "/api/v1/guides",
			options: []openapi.OperationOption{
				openapi.WithSummary("Create a guide"),
				openapi.WithTags("Guides"),
				openapi.WithRequest(&createGuideRequest{}),
				openapi.WithResponseStatus(http.StatusCreated, &createGuideResponse{}),
			},
			wantRequestBody:     true,
			wantSchemasNonEmpty: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(tt.method, tt.path, tt.options...)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			paths, ok := result["paths"].(map[string]any)
			require.True(t, ok)
			pathItem, ok := paths[tt.path].(map[string]any)
			require.True(t, ok)
			op, ok := pathItem[strings.ToLower(tt.method)].(map[string]any)
			require.True(t, ok)

			if tt.wantRequestBody {
				assert.Contains(t, op, "requestBody", "POST should have a request body")
			}
			if tt.wantSchemasNonEmpty {
				components, ok := result["components"].(map[string]any)
				require.True(t, ok)
				schemas, ok := components["schemas"].(map[string]any)
				require.True(t, ok)
				assert.NotEmpty(t, schemas, "request/response types should be in components/schemas")
			}
		})
	}
}

func TestOpenAPIService_AddOperation_Delete(t *testing.T) {
	t.Parallel()

	type deleteRequest struct {
		ID string `path:"id"`
	}

	cases := []struct {
		name             string
		method           string
		path             string
		options          []openapi.OperationOption
		wantOperationKey string
	}{
		{
			name:   "adds a DELETE operation with path parameter",
			method: http.MethodDelete,
			path:   "/api/v1/guides/{id}",
			options: []openapi.OperationOption{
				openapi.WithSummary("Delete a guide"),
				openapi.WithTags("Guides"),
				openapi.WithRequest(&deleteRequest{}),
				openapi.WithResponseStatus(http.StatusNoContent, &struct{}{}),
			},
			wantOperationKey: "delete",
		},
		{
			name:   "allows empty response for no-content operations",
			method: http.MethodDelete,
			path:   "/api/v1/items/{id}",
			options: []openapi.OperationOption{
				openapi.WithRequest(&deleteRequest{}),
				openapi.WithResponseStatus(http.StatusNoContent, &struct{}{}),
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(tt.method, tt.path, tt.options...)
			require.NoError(t, err)

			if tt.wantOperationKey == "" {
				return
			}

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			paths, ok := result["paths"].(map[string]any)
			require.True(t, ok)
			pathItem, ok := paths[tt.path].(map[string]any)
			require.True(t, ok)
			assert.Contains(t, pathItem, tt.wantOperationKey)
		})
	}
}

func TestOpenAPIService_SpecYAML(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name         string
		path         string
		wantContains []string
	}{
		{
			name:         "produces YAML containing the spec and path",
			path:         "/api/v1/health",
			wantContains: []string{"openapi: ", "/api/v1/health"},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(
				http.MethodGet,
				tt.path,
				openapi.WithResponseStatus(http.StatusOK, &struct {
					Status string `json:"status"`
				}{}),
			)
			require.NoError(t, err)

			yaml, err := svc.SpecYAML()
			require.NoError(t, err)

			for _, want := range tt.wantContains {
				assert.Contains(t, string(yaml), want)
			}
		})
	}
}

func TestOpenAPIService_Deprecated(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name           string
		method         string
		path           string
		options        []openapi.OperationOption
		wantDeprecated bool
	}{
		{
			name:   "marks an operation as deprecated",
			method: http.MethodGet,
			path:   "/api/v1/old-endpoint",
			options: []openapi.OperationOption{
				openapi.WithSummary("Old endpoint"),
				openapi.WithDeprecated(true),
				openapi.WithResponseStatus(http.StatusOK, &struct {
					Message string `json:"message"`
				}{}),
			},
			wantDeprecated: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(tt.method, tt.path, tt.options...)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			paths, ok := result["paths"].(map[string]any)
			require.True(t, ok)
			pathItem, ok := paths[tt.path].(map[string]any)
			require.True(t, ok)
			op, ok := pathItem[strings.ToLower(tt.method)].(map[string]any)
			require.True(t, ok)
			assert.Equal(t, tt.wantDeprecated, op["deprecated"])
		})
	}
}

func TestOpenAPIService_OperationID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name            string
		method          string
		path            string
		options         []openapi.OperationOption
		wantOperationID string
	}{
		{
			name:   "sets the operation ID",
			method: http.MethodPost,
			path:   "/api/v1/guides",
			options: []openapi.OperationOption{
				openapi.WithSummary("Create a guide"),
				openapi.WithOperationID("createGuide"),
				openapi.WithRequest(&struct {
					Title string `json:"title"`
				}{}),
				openapi.WithResponseStatus(http.StatusCreated, &struct {
					ID string `json:"id"`
				}{}),
			},
			wantOperationID: "createGuide",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(tt.method, tt.path, tt.options...)
			require.NoError(t, err)

			spec, err := svc.SpecJSON()
			require.NoError(t, err)

			var result map[string]any
			err = json.Unmarshal(spec, &result)
			require.NoError(t, err)

			paths, ok := result["paths"].(map[string]any)
			require.True(t, ok)
			pathItem, ok := paths[tt.path].(map[string]any)
			require.True(t, ok)
			op, ok := pathItem[strings.ToLower(tt.method)].(map[string]any)
			require.True(t, ok)
			assert.Equal(t, tt.wantOperationID, op["operationId"])
		})
	}
}
