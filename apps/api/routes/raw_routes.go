package routes

import "net/http"

// RawRoute is served by the application's own mux in front of Authula, for
// handlers Authula's buffered response writer can't support, such as streaming.
type RawRoute struct {
	Method  string
	Path    string
	Handler http.Handler
}

func (r RawRoute) Pattern() string {
	return r.Method + " " + r.Path
}
