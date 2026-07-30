package worker

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	cliqmodels "github.com/CliqRelay/cliqrelay/models"
)

func HandleGuideExportEvent(exportService interfaces.ExportService) StreamHandler {
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

func handleGuideExport(ctx context.Context, ev *events.Event, exportService interfaces.ExportService) error {
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
