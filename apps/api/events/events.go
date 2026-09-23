package events

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/models"
)

const TopicMediaAssets = "streams:media-assets"
const TopicGuides = "streams:guides"
const TopicGuideExports = "streams:guide-exports"
const TopicActivity = "streams:activity"

const EventTypeMediaAssetDeleted = "media-asset.deleted"
const EventTypeGuidePurge = "guide.purge"
const EventTypeGuideExport = "guide.export"
const EventTypeActivityRecorded = "activity.recorded"

var streamMaxlens = map[string]int64{
	TopicMediaAssets:  100_000,
	TopicGuides:       10_000,
	TopicGuideExports: 10_000,
	TopicActivity:     50_000,
}

type Event struct {
	ID      string          `json:"id"`
	Type    string          `json:"event_type"`
	Payload json.RawMessage `json:"payload"`
}

func NewEvent(eventType string, payload any) (*Event, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return &Event{
		ID:      uuid.New().String(),
		Type:    eventType,
		Payload: data,
	}, nil
}

func (e *Event) Marshal() ([]byte, error) {
	return json.Marshal(e)
}

func (e *Event) UnmarshalPayload(target any) error {
	return json.Unmarshal(e.Payload, target)
}

type eventReader struct {
	ID   string          `json:"id"`
	Type string          `json:"event_type"`
	Data json.RawMessage `json:"payload"`
}

func ReadEvent(data []byte) (*Event, error) {
	var r eventReader
	if err := json.Unmarshal(data, &r); err != nil {
		return nil, err
	}
	return &Event{
		ID:      r.ID,
		Type:    r.Type,
		Payload: r.Data,
	}, nil
}

func Publish(ctx context.Context, client *redis.Client, stream, eventType string, payload any) error {
	ev, err := NewEvent(eventType, payload)
	if err != nil {
		return err
	}

	data, err := ev.Marshal()
	if err != nil {
		return err
	}

	return client.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		MaxLen: streamMaxlens[stream],
		Approx: true,
		Values: map[string]any{
			"event_type": ev.Type,
			"payload":    string(data),
		},
	}).Err()
}

type MediaAssetDeletePayload struct {
	StepID      string `json:"step_id"`
	StoragePath string `json:"storage_path"`
}

type GuidePurgePayload struct {
	GuideID string `json:"guide_id"`
}

type GuideExportPayload struct {
	ExportID string `json:"export_id"`
	GuideID  string `json:"guide_id"`
	UserID   string `json:"user_id"`
	Format   string `json:"format"`
}

// ActivityRecordedPayload describes one activity. OrganizationID may be left
// empty when TeamID is set; the organization is then resolved from the team.
type ActivityRecordedPayload struct {
	EventID        string                   `json:"event_id"`
	EventType      string                   `json:"event_type"`
	OrganizationID string                   `json:"organization_id,omitempty"`
	TeamID         *string                  `json:"team_id,omitempty"`
	ActorID        string                   `json:"actor_id"`
	ActorType      models.ActivityActorType `json:"actor_type"`
	TargetID       string                   `json:"target_id"`
	TargetType     string                   `json:"target_type"`
	OccurredAt     time.Time                `json:"occurred_at"`
	Metadata       models.ActivityMetadata  `json:"metadata"`
}

// RealtimeTeamChannel is the pub/sub channel a team's realtime events are fanned out on.
func RealtimeTeamChannel(teamID string) string {
	return "realtime:team:" + teamID
}
