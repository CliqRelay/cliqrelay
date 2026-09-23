package activitylogs_test

import (
	"context"
	"testing"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	activitylogs "github.com/CliqRelay/cliqrelay/services/activity_logs"
	"github.com/CliqRelay/cliqrelay/tests"
)

func readActivityPayloads(t *testing.T, client *redis.Client) []events.ActivityRecordedPayload {
	t.Helper()
	msgs, err := client.XRange(context.Background(), events.TopicActivity, "-", "+").Result()
	require.NoError(t, err)

	payloads := make([]events.ActivityRecordedPayload, 0, len(msgs))
	for _, msg := range msgs {
		assert.Equal(t, events.EventTypeActivityRecorded, msg.Values["event_type"])
		ev, err := events.ReadEvent([]byte(msg.Values["payload"].(string)))
		require.NoError(t, err)
		var p events.ActivityRecordedPayload
		require.NoError(t, ev.UnmarshalPayload(&p))
		payloads = append(payloads, p)
	}
	return payloads
}

func TestRegisterGuideHooks(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.Actor{ID: uuid.NewString(), Type: authulamodels.ActorUser}
	guide := &models.Guide{
		ID:         uuid.New(),
		TeamID:     uuid.New(),
		CreatorID:  new(uuid.NewString()),
		Title:      "Onboarding",
		Status:     models.StatusDraft,
		Visibility: models.VisibilityPrivate,
	}

	cases := []struct {
		name      string
		fire      func(*interfaces.GuideHooks) error
		setup     func(*tests.MockGuidesRepository)
		wantEvent models.ActivityEventType
	}{
		{
			name: "after create",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterCreateHooks()[0](context.Background(), actor, guide)
			},
			wantEvent: models.ActivityGuideCreated,
		},
		{
			name: "after update",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterUpdateHooks()[0](context.Background(), actor, guide)
			},
			wantEvent: models.ActivityGuideUpdated,
		},
		{
			name: "after publish",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterPublishHooks()[0](context.Background(), actor, guide)
			},
			wantEvent: models.ActivityGuidePublished,
		},
		{
			name: "after archive",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterArchiveHooks()[0](context.Background(), actor, guide)
			},
			wantEvent: models.ActivityGuideArchived,
		},
		{
			name: "after delete looks the guide up",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterDeleteHooks()[0](context.Background(), actor, guide.ID.String())
			},
			setup: func(repo *tests.MockGuidesRepository) {
				repo.On("GetByID", mock.Anything, guide.ID.String()).Return(guide, nil).Once()
			},
			wantEvent: models.ActivityGuideDeleted,
		},
		{
			name: "after bulk restore publishes one event per guide",
			fire: func(h *interfaces.GuideHooks) error {
				return h.AfterBulkRestoreHooks()[0](context.Background(), actor, guide.TeamID.String(), []string{guide.ID.String()})
			},
			setup: func(repo *tests.MockGuidesRepository) {
				repo.On("GetByID", mock.Anything, guide.ID.String()).Return(guide, nil).Once()
			},
			wantEvent: models.ActivityGuideRestored,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client, _ := tests.NewTestRedis(t)
			repo := new(tests.MockGuidesRepository)
			if tt.setup != nil {
				tt.setup(repo)
			}
			hooks := &interfaces.GuideHooks{}
			activitylogs.RegisterGuideHooks(hooks, client, repo, nil)

			require.NoError(t, tt.fire(hooks))

			payloads := readActivityPayloads(t, client)
			require.Len(t, payloads, 1)
			p := payloads[0]
			assert.Equal(t, tt.wantEvent.ToString(), p.EventType)
			assert.Equal(t, guide.TeamID.String(), *p.TeamID)
			assert.Empty(t, p.OrganizationID)
			assert.Equal(t, actor.ID, p.ActorID)
			assert.Equal(t, models.ActivityActorUser, p.ActorType)
			assert.Equal(t, guide.ID.String(), p.TargetID)
			assert.Equal(t, models.ActivityTargetGuide, p.TargetType)
			assert.NotEmpty(t, p.EventID)
			assert.Equal(t, models.ActivityMetadata{
				Guide: &models.ActivityGuideMetadata{
					Title:      "Onboarding",
					Status:     models.StatusDraft,
					Visibility: models.VisibilityPrivate,
					CreatorID:  guide.CreatorID,
				},
			}, p.Metadata)
			repo.AssertExpectations(t)
		})
	}
}

func TestRegisterGuideHooks_SwallowsFailures(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.Actor{ID: uuid.NewString(), Type: authulamodels.ActorUser}
	guide := &models.Guide{ID: uuid.New(), TeamID: uuid.New(), Title: "x"}

	t.Run("unreachable redis", func(t *testing.T) {
		t.Parallel()
		hooks := &interfaces.GuideHooks{}
		activitylogs.RegisterGuideHooks(hooks, tests.NewUnreachableRedis(t), nil, nil)

		assert.NoError(t, hooks.AfterCreateHooks()[0](context.Background(), actor, guide))
		assert.NoError(t, hooks.AfterUpdateHooks()[0](context.Background(), actor, guide))
		assert.NoError(t, hooks.AfterPublishHooks()[0](context.Background(), actor, guide))
	})

	t.Run("guide lookup fails", func(t *testing.T) {
		t.Parallel()
		client, _ := tests.NewTestRedis(t)
		repo := new(tests.MockGuidesRepository)
		repo.On("GetByID", mock.Anything, guide.ID.String()).Return(nil, assert.AnError).Once()
		hooks := &interfaces.GuideHooks{}
		activitylogs.RegisterGuideHooks(hooks, client, repo, nil)

		assert.NoError(t, hooks.AfterDeleteHooks()[0](context.Background(), actor, guide.ID.String()))
		assert.Empty(t, readActivityPayloads(t, client))
	})

	t.Run("cancelled request context still publishes", func(t *testing.T) {
		t.Parallel()
		client, _ := tests.NewTestRedis(t)
		hooks := &interfaces.GuideHooks{}
		activitylogs.RegisterGuideHooks(hooks, client, nil, nil)

		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		assert.NoError(t, hooks.AfterCreateHooks()[0](ctx, actor, guide))
		assert.Len(t, readActivityPayloads(t, client), 1)
	})
}

func TestRegisterGuideHooks_ActorTypes(t *testing.T) {
	t.Parallel()

	guide := &models.Guide{ID: uuid.New(), TeamID: uuid.New(), Title: "x"}

	cases := []struct {
		name          string
		actor         *authulamodels.Actor
		wantActorType models.ActivityActorType
		wantSkipped   bool
	}{
		{
			name:          "user actor",
			actor:         &authulamodels.Actor{ID: uuid.NewString(), Type: authulamodels.ActorUser},
			wantActorType: models.ActivityActorUser,
		},
		{
			name:          "machine actor",
			actor:         &authulamodels.Actor{ID: uuid.NewString(), Type: authulamodels.ActorMachine},
			wantActorType: models.ActivityActorMachine,
		},
		{
			name:        "missing actor is skipped",
			actor:       nil,
			wantSkipped: true,
		},
		{
			name:        "unknown actor type is skipped",
			actor:       &authulamodels.Actor{ID: uuid.NewString(), Type: "robot"},
			wantSkipped: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			client, _ := tests.NewTestRedis(t)
			hooks := &interfaces.GuideHooks{}
			activitylogs.RegisterGuideHooks(hooks, client, nil, nil)

			assert.NoError(t, hooks.AfterCreateHooks()[0](context.Background(), tt.actor, guide))

			payloads := readActivityPayloads(t, client)
			if tt.wantSkipped {
				assert.Empty(t, payloads)
				return
			}
			require.Len(t, payloads, 1)
			assert.Equal(t, tt.actor.ID, payloads[0].ActorID)
			assert.Equal(t, tt.wantActorType, payloads[0].ActorType)
		})
	}
}
