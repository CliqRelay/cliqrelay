package openapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/openapi"
)

func TestNewOpenAPISpecHandler(t *testing.T) {
	t.Parallel()

	healthResponse := &struct {
		Status string `json:"status"`
	}{}

	cases := []struct {
		name               string
		addOperation       bool
		wantStatus         int
		wantContentType    string
		wantOpenAPIVersion string
		wantPaths          bool
	}{
		{
			name:               "serves valid JSON spec",
			addOperation:       true,
			wantStatus:         http.StatusOK,
			wantContentType:    "application/json",
			wantOpenAPIVersion: "3.0.3",
			wantPaths:          true,
		},
		{
			name:       "serves an empty spec",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			if tt.addOperation {
				err = svc.AddOperation(
					http.MethodGet,
					"/api/v1/health",
					openapi.WithResponseStatus(http.StatusOK, healthResponse),
				)
				require.NoError(t, err)
			}

			handler := openapi.NewOpenAPISpecHandler(svc)
			req := httptest.NewRequest(http.MethodGet, "/api/v1/openapi.json", nil)
			rec := httptest.NewRecorder()
			handler(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)

			if tt.wantContentType != "" {
				assert.Equal(t, tt.wantContentType, rec.Header().Get("Content-Type"))
			}

			if tt.wantOpenAPIVersion != "" {
				var result map[string]any
				err = json.Unmarshal(rec.Body.Bytes(), &result)
				require.NoError(t, err)
				assert.Equal(t, tt.wantOpenAPIVersion, result["openapi"])

				if tt.wantPaths {
					assert.Contains(t, result, "paths")
				}
			}
		})
	}
}

func TestNewOpenAPISpecYAMLHandler(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name             string
		wantStatus       int
		wantContentType  string
		wantBodyContains string
	}{
		{
			name:             "serves YAML spec",
			wantStatus:       http.StatusOK,
			wantContentType:  "text/vnd.yaml",
			wantBodyContains: "openapi: ",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			svc, err := openapi.NewOpenAPIService("Test API", "1.0.0", "", "http://localhost:8080")
			require.NoError(t, err)

			err = svc.AddOperation(
				http.MethodGet,
				"/api/v1/health",
				openapi.WithResponseStatus(http.StatusOK, &struct {
					Status string `json:"status"`
				}{}),
			)
			require.NoError(t, err)

			handler := openapi.NewOpenAPISpecYAMLHandler(svc)
			req := httptest.NewRequest(http.MethodGet, "/api/v1/openapi.yaml", nil)
			rec := httptest.NewRecorder()
			handler(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
			assert.Equal(t, tt.wantContentType, rec.Header().Get("Content-Type"))
			assert.Contains(t, rec.Body.String(), tt.wantBodyContains)
		})
	}
}
