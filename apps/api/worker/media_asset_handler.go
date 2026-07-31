package worker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

func HandleMediaAssetsEvent(storageService interfaces.StorageService, bucket string) StreamHandler {
	return func(ctx context.Context, msgID string, payload []byte) error {
		event, err := events.ReadEvent(payload)
		if err != nil {
			return &HandlerError{Err: fmt.Errorf("read event: %w", err), Mode: NackModeFatal}
		}

		switch event.Type {
		case events.EventTypeMediaAssetDeleted:
			return handleMediaAssetDeleted(ctx, event, storageService, bucket)
		default:
			return &HandlerError{Err: fmt.Errorf("unknown event type: %s", event.Type), Mode: NackModeFail}
		}
	}
}

func handleMediaAssetDeleted(ctx context.Context, ev *events.Event, storageService interfaces.StorageService, bucket string) error {
	var payload events.MediaAssetDeletePayload
	if err := ev.UnmarshalPayload(&payload); err != nil {
		return &HandlerError{Err: fmt.Errorf("unmarshal payload: %w", err), Mode: NackModeFatal}
	}

	if err := storageService.DeleteObject(ctx, bucket, payload.StoragePath); err != nil {
		slog.Error("failed to delete object from s3", "step_id", payload.StepID, "bucket", bucket, "path", payload.StoragePath, "err", err)
		return &HandlerError{Err: fmt.Errorf("delete object: %w", err), Mode: NackModeSilent}
	}

	return nil
}
