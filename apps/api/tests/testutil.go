package tests

import (
	"strings"
	"testing"

	"github.com/Authula/authula/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/config"
)

func NewTestAppConfig() *config.AppConfig {
	return &config.AppConfig{}
}

func AssertResponseStatus(t *testing.T, reqCtx *models.RequestContext, expectedStatus int) {
	t.Helper()

	assert.Equal(t, expectedStatus, reqCtx.ResponseStatus)
}

func AssertResponseContains(t *testing.T, reqCtx *models.RequestContext, key, expected string) {
	t.Helper()

	var envelope map[string]any
	DecodeResponsePayload(t, reqCtx, &envelope)

	parts := strings.Split(key, ".")
	current := envelope
	for i, part := range parts {
		isLast := i == len(parts)-1

		if isLast {
			val, ok := current[part]
			require.True(t, ok, "response missing key %q", key)

			valStr, ok := val.(string)
			require.True(t, ok, "response key %q is not a string, got %T", key, val)

			assert.Contains(t, valStr, expected)
		} else {
			nested, ok := current[part].(map[string]any)
			require.True(t, ok, "response key %q is not an object", strings.Join(parts[:i+1], "."))
			current = nested
		}
	}
}

func AssertResponseMessage(t *testing.T, reqCtx *models.RequestContext, expectedMsg string) {
	t.Helper()

	AssertResponseContains(t, reqCtx, "message", expectedMsg)
}
