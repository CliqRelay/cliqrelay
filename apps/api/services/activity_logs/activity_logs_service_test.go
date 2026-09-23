package activitylogs_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/models"
	activitylogs "github.com/CliqRelay/cliqrelay/services/activity_logs"
	"github.com/CliqRelay/cliqrelay/services/realtime"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func newPayload(eventType models.ActivityEventType) *events.ActivityRecordedPayload {
	return &events.ActivityRecordedPayload{
		EventID:        uuid.NewString(),
		EventType:      eventType.ToString(),
		OrganizationID: uuid.NewString(),
		TeamID:         new(uuid.NewString()),
		ActorID:        uuid.NewString(),
		ActorType:      models.ActivityActorUser,
		TargetID:       uuid.NewString(),
		TargetType:     models.ActivityTargetGuide,
		OccurredAt:     time.Now().UTC().Truncate(time.Millisecond),
		Metadata: models.ActivityMetadata{
			Guide: &models.ActivityGuideMetadata{
				Title:      "Onboarding",
				Visibility: models.VisibilityTeam,
				CreatorID:  new(uuid.NewString()),
			},
		},
	}
}

func TestActivityLogsService_Record(t *testing.T) {
	t.Parallel()

	actor := &authulamodels.User{Name: "Ada"}
	mergedID := uuid.New()
	resolvedOrganizationID := uuid.New()

	cases := []struct {
		name        string
		payload     *events.ActivityRecordedPayload
		setup       func(*tests.MockActivityLogsRepository, *events.ActivityRecordedPayload)
		wantErr     error
		wantPublish bool
		// wantID overrides the published row ID expected, for merged rows.
		wantID      string
		wantUserIDs []string
	}{
		{
			name:    "attaches the actor name, inserts, then publishes",
			payload: newPayload(models.ActivityGuideCreated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.MatchedBy(func(l *models.ActivityLog) bool {
					return l.ID.String() == p.EventID &&
						l.OrganizationID.String() == p.OrganizationID &&
						l.TargetID == p.TargetID &&
						l.Metadata.User.Name == "Ada" &&
						l.Metadata.Guide.Title == "Onboarding" &&
						l.CreatedAt.Equal(p.OccurredAt)
				})).Return(true, nil).Once()
			},
			wantPublish: true,
		},
		{
			name:    "does not publish a duplicate",
			payload: newPayload(models.ActivityGuideCreated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.Anything).Return(false, nil).Once()
			},
		},
		{
			name:    "syncs visibility on update",
			payload: newPayload(models.ActivityGuideUpdated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(nil, nil).Once()
				repo.On("InsertOrMergeUpdate", mock.Anything, mock.Anything, models.ActivityUpdateMergeWindow).
					Return(&models.ActivityLog{ID: uuid.MustParse(p.EventID), TeamID: new(uuid.MustParse(*p.TeamID))}, true, nil).Once()
				repo.On("SyncGuideVisibility", mock.Anything, p.TargetID, models.VisibilityTeam).Return(nil).Once()
			},
			wantPublish: true,
		},
		{
			name:    "publishes the merged row for an update within the session",
			payload: newPayload(models.ActivityGuideUpdated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(nil, nil).Once()
				repo.On("InsertOrMergeUpdate", mock.Anything, mock.Anything, models.ActivityUpdateMergeWindow).
					Return(&models.ActivityLog{ID: mergedID, TeamID: new(uuid.MustParse(*p.TeamID))}, true, nil).Once()
				repo.On("SyncGuideVisibility", mock.Anything, p.TargetID, models.VisibilityTeam).Return(nil).Once()
			},
			wantPublish: true,
			wantID:      mergedID.String(),
		},
		{
			name:    "does not publish an update the session already covers",
			payload: newPayload(models.ActivityGuideUpdated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(nil, nil).Once()
				repo.On("InsertOrMergeUpdate", mock.Anything, mock.Anything, models.ActivityUpdateMergeWindow).
					Return(&models.ActivityLog{ID: mergedID}, false, nil).Once()
				repo.On("SyncGuideVisibility", mock.Anything, p.TargetID, models.VisibilityTeam).Return(nil).Once()
			},
		},
		{
			name: "publishes a private guide's activity only to its creator",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.Metadata.Guide.Visibility = models.VisibilityPrivate
				p.Metadata.Guide.CreatorID = new("creator-1")
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.Anything).Return(true, nil).Once()
			},
			wantPublish: true,
			wantUserIDs: []string{"creator-1"},
		},
		{
			name: "does not publish a private guide's activity nobody can see",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.Metadata.Guide.Visibility = models.VisibilityPrivate
				p.Metadata.Guide.CreatorID = nil
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.Anything).Return(true, nil).Once()
			},
		},
		{
			name:    "insert failure is returned for retry",
			payload: newPayload(models.ActivityGuideCreated),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.Anything).Return(false, assert.AnError).Once()
			},
			wantErr: assert.AnError,
		},
		{
			name: "resolves the organization from the team",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.OrganizationID = ""
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetTeamOrganizationID", mock.Anything, uuid.MustParse(*p.TeamID)).Return(resolvedOrganizationID, nil).Once()
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.MatchedBy(func(l *models.ActivityLog) bool {
					return l.OrganizationID == resolvedOrganizationID
				})).Return(true, nil).Once()
			},
			wantPublish: true,
		},
		{
			name: "an unknown team is rejected",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.OrganizationID = ""
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetTeamOrganizationID", mock.Anything, uuid.MustParse(*p.TeamID)).Return(uuid.Nil, nil).Once()
			},
			wantErr: constants.ErrInvalidActivityPayload,
		},
		{
			name: "records organization-level activity without publishing it",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.TeamID = nil
				p.Metadata.Guide = nil
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("GetUserByID", mock.Anything, p.ActorID).Return(actor, nil).Once()
				repo.On("Insert", mock.Anything, mock.MatchedBy(func(l *models.ActivityLog) bool {
					return l.TeamID == nil && l.OrganizationID.String() == p.OrganizationID
				})).Return(true, nil).Once()
			},
		},
		{
			name: "does not look up a machine actor as a user",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.ActorType = models.ActivityActorMachine
				return p
			}(),
			setup: func(repo *tests.MockActivityLogsRepository, p *events.ActivityRecordedPayload) {
				repo.On("Insert", mock.Anything, mock.MatchedBy(func(l *models.ActivityLog) bool {
					return l.ActorID == p.ActorID && l.ActorType == models.ActivityActorMachine && l.Metadata.User == nil
				})).Return(true, nil).Once()
			},
			wantPublish: true,
		},
		{
			name: "a missing actor is rejected",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.ActorID = ""
				return p
			}(),
			setup:   func(*tests.MockActivityLogsRepository, *events.ActivityRecordedPayload) {},
			wantErr: constants.ErrInvalidActivityPayload,
		},
		{
			name: "a missing target is rejected",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.TargetID = ""
				return p
			}(),
			setup:   func(*tests.MockActivityLogsRepository, *events.ActivityRecordedPayload) {},
			wantErr: constants.ErrInvalidActivityPayload,
		},
		{
			name: "malformed ids are rejected",
			payload: func() *events.ActivityRecordedPayload {
				p := newPayload(models.ActivityGuideCreated)
				p.TeamID = new("not-a-uuid")
				return p
			}(),
			setup:   func(*tests.MockActivityLogsRepository, *events.ActivityRecordedPayload) {},
			wantErr: constants.ErrInvalidActivityPayload,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			client, _ := tests.NewTestRedis(t)
			repo := new(tests.MockActivityLogsRepository)
			tt.setup(repo, tt.payload)
			svc := activitylogs.NewActivityLogsService(repo, realtime.NewRealtimeService(client, nil), nil)

			teamID := uuid.NewString()
			if tt.payload.TeamID != nil {
				teamID = *tt.payload.TeamID
			}
			sub := client.Subscribe(context.Background(), events.RealtimeTeamChannel(teamID))
			_, err := sub.Receive(context.Background())
			require.NoError(t, err)
			t.Cleanup(func() { _ = sub.Close() })

			err = svc.Record(context.Background(), tt.payload)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				require.NoError(t, err)
			}

			select {
			case msg := <-sub.Channel():
				require.True(t, tt.wantPublish, "unexpected publish")
				var event types.RealtimeEvent
				require.NoError(t, json.Unmarshal([]byte(msg.Payload), &event))
				assert.Equal(t, types.RealtimeEventActivity, event.Type)
				assert.Equal(t, tt.wantUserIDs, event.UserIDs)
				var log models.ActivityLog
				require.NoError(t, json.Unmarshal(event.Data, &log))
				wantID := tt.payload.EventID
				if tt.wantID != "" {
					wantID = tt.wantID
				}
				assert.Equal(t, wantID, log.ID.String())
			case <-time.After(100 * time.Millisecond):
				assert.False(t, tt.wantPublish, "expected a publish")
			}
			repo.AssertExpectations(t)
		})
	}
}

func TestActivityLogsService_DeleteByTarget(t *testing.T) {
	t.Parallel()

	guideID := uuid.NewString()

	cases := []struct {
		name    string
		repoErr error
	}{
		{name: "deletes every entry about the target"},
		{name: "returns the repository error", repoErr: assert.AnError},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := new(tests.MockActivityLogsRepository)
			repo.On("DeleteByTarget", mock.Anything, models.ActivityTargetGuide, guideID).Return(tt.repoErr).Once()
			svc := activitylogs.NewActivityLogsService(repo, nil, nil)

			err := svc.DeleteByTarget(context.Background(), models.ActivityTargetGuide, guideID)

			assert.ErrorIs(t, err, tt.repoErr)
			repo.AssertExpectations(t)
		})
	}
}
