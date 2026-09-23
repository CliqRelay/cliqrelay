package activitylogs

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

const publishTimeout = 500 * time.Millisecond

type guideEmitter struct {
	redisClient *redis.Client
	guidesRepo  interfaces.GuidesRepository
	logger      *slog.Logger
}

// RegisterGuideHooks records guide lifecycle events on the activity stream. Every hook
// returns nil: an after-hook error would fail a request whose change already happened.
// guidesRepo resolves the guide for hooks that only receive IDs (delete, bulk restore).
func RegisterGuideHooks(h *interfaces.GuideHooks, redisClient *redis.Client, guidesRepo interfaces.GuidesRepository, logger *slog.Logger) {
	if logger == nil {
		logger = slog.Default()
	}
	e := &guideEmitter{redisClient: redisClient, guidesRepo: guidesRepo, logger: logger}

	h.RegisterAfterCreate(e.onGuide(models.ActivityGuideCreated))
	h.RegisterAfterUpdate(e.onGuide(models.ActivityGuideUpdated))
	h.RegisterAfterPublish(e.onGuide(models.ActivityGuidePublished))
	h.RegisterAfterUnpublish(e.onGuide(models.ActivityGuideUnpublished))
	h.RegisterAfterArchive(e.onGuide(models.ActivityGuideArchived))
	h.RegisterAfterUnarchive(e.onGuide(models.ActivityGuideUnarchived))
	h.RegisterAfterRestore(e.onGuide(models.ActivityGuideRestored))
	h.RegisterAfterDelete(e.onGuideID(models.ActivityGuideDeleted))
	h.RegisterAfterBulkRestore(func(ctx context.Context, actor *authulamodels.Actor, _ string, guideIDs []string) error {
		for _, guideID := range guideIDs {
			e.publishByID(ctx, models.ActivityGuideRestored, actor, guideID)
		}
		return nil
	})
}

func (e *guideEmitter) onGuide(eventType models.ActivityEventType) interfaces.GuideHook {
	return func(ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error {
		e.publish(ctx, eventType, actor, guide)
		return nil
	}
}

func (e *guideEmitter) onGuideID(eventType models.ActivityEventType) interfaces.DeleteGuideHook {
	return func(ctx context.Context, actor *authulamodels.Actor, guideID string) error {
		e.publishByID(ctx, eventType, actor, guideID)
		return nil
	}
}

func (e *guideEmitter) publishByID(ctx context.Context, eventType models.ActivityEventType, actor *authulamodels.Actor, guideID string) {
	if e.guidesRepo == nil {
		return
	}
	guide, err := e.guidesRepo.GetByID(ctx, guideID)
	if err != nil || guide == nil {
		e.logger.Error("failed to load guide for activity", "guide_id", guideID, "event_type", eventType, "err", err)
		return
	}
	e.publish(ctx, eventType, actor, guide)
}

func (e *guideEmitter) publish(ctx context.Context, eventType models.ActivityEventType, actor *authulamodels.Actor, guide *models.Guide) {
	if guide == nil {
		return
	}
	actorType, ok := activityActorType(actor)
	if !ok {
		e.logger.Warn("skipping activity without a known actor", "guide_id", guide.ID, "event_type", eventType)
		return
	}

	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), publishTimeout)
	defer cancel()

	if err := events.Publish(ctx, e.redisClient, events.TopicActivity, events.EventTypeActivityRecorded, guideActivityPayload(eventType, actor.ID, actorType, guide)); err != nil {
		e.logger.Error("failed to publish activity event", "guide_id", guide.ID, "event_type", eventType, "err", err)
	}
}

// activityActorType maps an Authula actor to who performed the activity. API keys
// owned by a user act as that user; organization API keys are machine actors.
func activityActorType(actor *authulamodels.Actor) (models.ActivityActorType, bool) {
	if actor == nil || actor.ID == "" {
		return "", false
	}
	switch actor.Type {
	case authulamodels.ActorUser:
		return models.ActivityActorUser, true
	case authulamodels.ActorMachine:
		return models.ActivityActorMachine, true
	default:
		return "", false
	}
}

func guideActivityPayload(eventType models.ActivityEventType, actorID string, actorType models.ActivityActorType, guide *models.Guide) *events.ActivityRecordedPayload {
	teamID := guide.TeamID.String()

	return &events.ActivityRecordedPayload{
		EventID:    uuid.NewString(),
		EventType:  eventType.ToString(),
		TeamID:     &teamID,
		ActorID:    actorID,
		ActorType:  actorType,
		TargetID:   guide.ID.String(),
		TargetType: models.ActivityTargetGuide,
		OccurredAt: time.Now().UTC(),
		Metadata: models.ActivityMetadata{
			Guide: &models.ActivityGuideMetadata{
				Title:      guide.Title,
				Status:     guide.Status,
				Visibility: guide.Visibility,
				CreatorID:  guide.CreatorID,
			},
		},
	}
}
