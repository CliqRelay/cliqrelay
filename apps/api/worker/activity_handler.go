package worker

import (
	"context"
	"errors"
	"fmt"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

func HandleActivityRecordedEvent(activityLogsService interfaces.ActivityLogsService) StreamHandler {
	return func(ctx context.Context, msgID string, payload []byte) error {
		event, err := events.ReadEvent(payload)
		if err != nil {
			return &HandlerError{Err: fmt.Errorf("read event: %w", err), Mode: NackModeFatal}
		}

		switch event.Type {
		case events.EventTypeActivityRecorded:
			return handleActivityRecorded(ctx, event, activityLogsService)
		default:
			return &HandlerError{Err: fmt.Errorf("unknown event type: %s", event.Type), Mode: NackModeFail}
		}
	}
}

func handleActivityRecorded(ctx context.Context, ev *events.Event, activityLogsService interfaces.ActivityLogsService) error {
	var payload events.ActivityRecordedPayload
	if err := ev.UnmarshalPayload(&payload); err != nil {
		return &HandlerError{Err: fmt.Errorf("unmarshal payload: %w", err), Mode: NackModeFatal}
	}

	if err := activityLogsService.Record(ctx, &payload); err != nil {
		if errors.Is(err, constants.ErrInvalidActivityPayload) {
			return &HandlerError{Err: err, Mode: NackModeFatal}
		}
		return &HandlerError{Err: fmt.Errorf("record activity: %w", err), Mode: NackModeFail}
	}

	return nil
}
