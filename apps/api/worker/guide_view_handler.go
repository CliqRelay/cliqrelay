package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

func HandleGuideViewEvent(guideViewsRepo interfaces.GuideViewsRepository) StreamHandler {
	return func(ctx context.Context, msgID string, payload []byte) error {
		event, err := events.ReadEvent(payload)
		if err != nil {
			return &HandlerError{Err: fmt.Errorf("read event: %w", err), Mode: NackModeFatal}
		}

		switch event.Type {
		case events.EventTypeGuideViewed:
			return handleGuideViewed(ctx, event, guideViewsRepo)
		default:
			return &HandlerError{Err: fmt.Errorf("unknown event type: %s", event.Type), Mode: NackModeFail}
		}
	}
}

func handleGuideViewed(ctx context.Context, event *events.Event, repo interfaces.GuideViewsRepository) error {
	var payload events.GuideViewPayload
	if err := event.UnmarshalPayload(&payload); err != nil {
		return &HandlerError{Err: fmt.Errorf("unmarshal payload: %w", err), Mode: NackModeFatal}
	}

	viewedAt, err := time.Parse(time.RFC3339, payload.ViewedAt)
	if err != nil {
		return &HandlerError{Err: fmt.Errorf("parse viewed_at: %w", err), Mode: NackModeFatal}
	}

	var viewerID *uuid.UUID
	if payload.ViewerID != nil {
		viewerID = payload.ViewerID
	}

	var ipHash *string
	if payload.IPHash != nil {
		ipHash = payload.IPHash
	}

	var userAgent *string
	if payload.UserAgent != nil {
		userAgent = payload.UserAgent
	}

	dto := &types.CreateGuideViewDTO{
		TeamID:    payload.TeamID,
		GuideID:   payload.GuideID,
		ViewerID:  viewerID,
		IPHash:    ipHash,
		UserAgent: userAgent,
		ViewedAt:  viewedAt,
	}

	if err := repo.Create(ctx, dto); err != nil {
		return &HandlerError{Err: fmt.Errorf("create guide view: %w", err), Mode: NackModeSilent}
	}

	return nil
}
