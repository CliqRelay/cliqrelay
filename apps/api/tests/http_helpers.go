package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	authulamodels "github.com/Authula/authula/models"
)

type HandlerTestRequest struct {
	Req    *http.Request
	W      *httptest.ResponseRecorder
	ReqCtx *authulamodels.RequestContext
}

func NewHandlerRequest(t *testing.T, method, path string, payload any) HandlerTestRequest {
	t.Helper()

	var body *bytes.Reader
	if payload == nil {
		body = bytes.NewReader(nil)
	} else {
		encoded, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("failed to marshal json payload: %v", err)
		}
		body = bytes.NewReader(encoded)
	}

	req := httptest.NewRequest(method, path, body)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	actor := &authulamodels.Actor{
		ID:   "test-user-123",
		Type: authulamodels.ActorUser,
	}

	rc := &authulamodels.RequestContext{
		Actor:  actor,
		Values: make(map[string]any),
	}

	req = req.WithContext(authulamodels.NewContextWithRequestContext(req.Context(), rc))
	w := httptest.NewRecorder()

	return HandlerTestRequest{
		Req:    req,
		W:      w,
		ReqCtx: rc,
	}
}

func NewRawHandlerRequest(t *testing.T, method, path string, body []byte) HandlerTestRequest {
	t.Helper()

	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	actor := &authulamodels.Actor{
		ID:   "test-user-123",
		Type: authulamodels.ActorUser,
	}

	rc := &authulamodels.RequestContext{
		Actor:  actor,
		Values: make(map[string]any),
	}

	req = req.WithContext(authulamodels.NewContextWithRequestContext(req.Context(), rc))
	w := httptest.NewRecorder()

	return HandlerTestRequest{
		Req:    req,
		W:      w,
		ReqCtx: rc,
	}
}

func DecodeResponsePayload(t *testing.T, reqCtx *authulamodels.RequestContext, dest any) {
	t.Helper()

	if !reqCtx.ResponseReady {
		t.Fatalf("response not ready")
	}

	err := json.Unmarshal(reqCtx.ResponseBody, dest)
	if err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
}
