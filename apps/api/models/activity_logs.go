package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/swaggest/jsonschema-go"
	"github.com/uptrace/bun"
)

type ActivityEventType string

const (
	ActivityGuideCreated     ActivityEventType = "guide.created"
	ActivityGuideUpdated     ActivityEventType = "guide.updated"
	ActivityGuidePublished   ActivityEventType = "guide.published"
	ActivityGuideUnpublished ActivityEventType = "guide.unpublished"
	ActivityGuideArchived    ActivityEventType = "guide.archived"
	ActivityGuideUnarchived  ActivityEventType = "guide.unarchived"
	ActivityGuideDeleted     ActivityEventType = "guide.deleted"
	ActivityGuideRestored    ActivityEventType = "guide.restored"
)

type ActivityActorType string

const (
	ActivityActorUser    ActivityActorType = "user"
	ActivityActorMachine ActivityActorType = "machine"
)

const ActivityTargetGuide = "guide"

const ActivityUpdateMergeWindow = time.Minute

func (t ActivityEventType) ToString() string {
	return string(t)
}

func (ActivityEventType) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(ActivityGuideCreated),
		string(ActivityGuideUpdated),
		string(ActivityGuidePublished),
		string(ActivityGuideUnpublished),
		string(ActivityGuideArchived),
		string(ActivityGuideUnarchived),
		string(ActivityGuideDeleted),
		string(ActivityGuideRestored),
	}
	schema.WithDescription("The type of activity that was recorded")
	return nil
}

func (t ActivityActorType) ToString() string {
	return string(t)
}

func (ActivityActorType) PrepareJSONSchema(schema *jsonschema.Schema) error {
	schema.WithType(jsonschema.String.Type())
	schema.Enum = []any{
		string(ActivityActorUser),
		string(ActivityActorMachine),
	}
	schema.WithDescription("The kind of actor that performed the activity")
	return nil
}

type ActivityGuideMetadata struct {
	Title      string      `json:"title" required:"true"`
	Status     GuideStatus `json:"status" required:"true"`
	Visibility Visibility  `json:"visibility" required:"true"`
	CreatorID  *string     `json:"creator_id,omitempty"`
}

type ActivityUserMetadata struct {
	Name string `json:"name" required:"true"`
}

type ActivityMetadata struct {
	User  *ActivityUserMetadata  `json:"user,omitempty"`
	Guide *ActivityGuideMetadata `json:"guide,omitempty"`
}

type ActivityLog struct {
	bun.BaseModel `bun:"table:activity_logs"`

	ID             uuid.UUID         `json:"id" bun:"column:id,pk" required:"true"`
	OrganizationID uuid.UUID         `json:"organization_id" bun:"column:organization_id" required:"true"`
	TeamID         *uuid.UUID        `json:"team_id" bun:"column:team_id" required:"true" nullable:"true"`
	ActorID        string            `json:"actor_id" bun:"column:actor_id" required:"true"`
	ActorType      ActivityActorType `json:"actor_type" bun:"column:actor_type" required:"true"`
	EventType      ActivityEventType `json:"event_type" bun:"column:event_type" required:"true"`
	TargetID       string            `json:"target_id" bun:"column:target_id" required:"true"`
	TargetType     string            `json:"target_type" bun:"column:target_type" required:"true"`
	Metadata       ActivityMetadata  `json:"metadata" bun:"column:metadata,type:jsonb" required:"true"`
	CreatedAt      time.Time         `json:"created_at" bun:"column:created_at,default:current_timestamp" required:"true"`
}

// Audience mirrors the private-guide filter applied by the list query. It
// returns the only users who may see the entry, or nil when the whole team
// can; ok is false when nobody can.
func (log *ActivityLog) Audience() (userIDs []string, ok bool) {
	guide := log.Metadata.Guide
	if guide == nil || guide.Visibility != VisibilityPrivate {
		return nil, true
	}
	if guide.CreatorID == nil {
		return nil, false
	}
	return []string{*guide.CreatorID}, true
}
