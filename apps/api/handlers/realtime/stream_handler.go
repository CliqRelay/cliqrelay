package realtime

import (
	"fmt"
	"net/http"
	"time"

	"github.com/CliqRelay/cliqrelay/interfaces"
)

const streamPingInterval = 25 * time.Second

// StreamHandler serves a team's realtime events as Server-Sent Events, named
// by each event's type. It is mounted in front of Authula because Authula
// buffers responses, and it authenticates with a single-use ticket since
// EventSource cannot send the CSRF header.
type StreamHandler struct {
	realtimeUseCase interfaces.RealtimeUseCase
	allowedOrigin   string
	pingInterval    time.Duration
}

func NewStreamHandler(realtimeUseCase interfaces.RealtimeUseCase, allowedOrigin string) *StreamHandler {
	return &StreamHandler{
		realtimeUseCase: realtimeUseCase,
		allowedOrigin:   allowedOrigin,
		pingInterval:    streamPingInterval,
	}
}

func (h *StreamHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if h.allowedOrigin != "" {
		w.Header().Set("Access-Control-Allow-Origin", h.allowedOrigin)
	}

	claims, err := h.realtimeUseCase.RedeemTicket(ctx, r.URL.Query().Get("ticket"))
	if err != nil {
		http.Error(w, "invalid or expired stream ticket", http.StatusUnauthorized)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	feed, closeFeed, err := h.realtimeUseCase.Subscribe(ctx, claims.TeamID)
	if err != nil {
		http.Error(w, "failed to subscribe", http.StatusInternalServerError)
		return
	}
	defer func() { _ = closeFeed() }()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	ticker := time.NewTicker(h.pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case event, ok := <-feed:
			if !ok {
				return
			}
			if !event.VisibleTo(claims.UserID) {
				continue
			}
			if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, event.Data); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
