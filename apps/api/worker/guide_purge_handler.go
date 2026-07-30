package worker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

func HandleGuidePurgeEvent(purgeService interfaces.PurgeService) StreamHandler {
	return func(ctx context.Context, msgID string, payload []byte) error {
		event, err := events.ReadEvent(payload)
		if err != nil {
			return &HandlerError{Err: fmt.Errorf("read event: %w", err), Mode: NackModeFatal}
		}

		switch event.Type {
		case events.EventTypeGuidePurge:
			return handleGuidePurge(ctx, event, purgeService)
		default:
			return &HandlerError{Err: fmt.Errorf("unknown event type: %s", event.Type), Mode: NackModeFail}
		}
	}
}

func handleGuidePurge(ctx context.Context, ev *events.Event, purgeService interfaces.PurgeService) error {
	var payload events.GuidePurgePayload
	if err := ev.UnmarshalPayload(&payload); err != nil {
		return &HandlerError{Err: fmt.Errorf("unmarshal payload: %w", err), Mode: NackModeFatal}
	}

	if err := purgeService.PurgeGuide(ctx, payload.GuideID); err != nil {
		slog.Error("failed to purge guide", "guide_id", payload.GuideID, "err", err)
		return &HandlerError{Err: fmt.Errorf("purge guide: %w", err), Mode: NackModeSilent}
	}

	return nil
}
