package worker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/internal/events"
	"github.com/CliqRelay/cliqrelay/internal/interfaces"
	cliqmodels "github.com/CliqRelay/cliqrelay/internal/models"
	"github.com/CliqRelay/cliqrelay/internal/services/export"
	"github.com/CliqRelay/cliqrelay/internal/services/purge"
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

func HandleGuidePurgeEvent(purgeService *purge.PurgeService) StreamHandler {
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

func HandleGuideExportEvent(exportService *export.ExportService) StreamHandler {
	return func(ctx context.Context, msgID string, payload []byte) error {
		event, err := events.ReadEvent(payload)
		if err != nil {
			return &HandlerError{Err: fmt.Errorf("read event: %w", err), Mode: NackModeFatal}
		}

		switch event.Type {
		case events.EventTypeGuideExport:
			return handleGuideExport(ctx, event, exportService)
		default:
			return &HandlerError{Err: fmt.Errorf("unknown event type: %s", event.Type), Mode: NackModeFail}
		}
	}
}

func handleGuideExport(ctx context.Context, ev *events.Event, exportService *export.ExportService) error {
	var payload events.GuideExportPayload
	if err := ev.UnmarshalPayload(&payload); err != nil {
		return &HandlerError{Err: fmt.Errorf("unmarshal payload: %w", err), Mode: NackModeFatal}
	}

	exportID, err := uuid.Parse(payload.ExportID)
	if err != nil {
		return &HandlerError{Err: fmt.Errorf("parse export ID: %w", err), Mode: NackModeFatal}
	}

	guideID, err := uuid.Parse(payload.GuideID)
	if err != nil {
		return &HandlerError{Err: fmt.Errorf("parse guide ID: %w", err), Mode: NackModeFatal}
	}

	if err := exportService.GenerateExport(ctx, exportID, guideID, cliqmodels.ExportGuideFormat(payload.Format)); err != nil {
		slog.Error("failed to generate export", "export_id", payload.ExportID, "guide_id", payload.GuideID, "format", payload.Format, "err", err)
		return &HandlerError{Err: fmt.Errorf("generate export: %w", err), Mode: NackModeSilent}
	}

	return nil
}

func handleGuidePurge(ctx context.Context, ev *events.Event, purgeService *purge.PurgeService) error {
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
