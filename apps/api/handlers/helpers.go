package handlers

import (
	"net/http"
)

func ResolveWorkspaceID(r *http.Request) string {
	return r.PathValue("workspaceId")
}
