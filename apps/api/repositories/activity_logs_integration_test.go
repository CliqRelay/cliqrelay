package repositories_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	activitylogs "github.com/CliqRelay/cliqrelay/repositories/activity_logs"
)

func newActivityLog(t *testing.T, teamID uuid.UUID, actorID string, guide *models.Guide, createdAt time.Time) *models.ActivityLog {
	t.Helper()
	organizationID, err := activitylogs.NewBunActivityLogsRepository(activityDB).GetTeamOrganizationID(context.Background(), teamID)
	require.NoError(t, err)

	return &models.ActivityLog{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		TeamID:         &teamID,
		ActorID:        actorID,
		ActorType:      models.ActivityActorUser,
		TargetID:       guide.ID.String(),
		TargetType:     models.ActivityTargetGuide,
		EventType:      models.ActivityGuideCreated,
		Metadata: models.ActivityMetadata{
			Guide: &models.ActivityGuideMetadata{
				Title:      guide.Title,
				Visibility: guide.Visibility,
				CreatorID:  guide.CreatorID,
			},
		},
		CreatedAt: createdAt,
	}
}

func seedActivityGuide(t *testing.T, teamID uuid.UUID, creatorID string, visibility models.Visibility) *models.Guide {
	t.Helper()
	guide := &models.Guide{
		ID:         uuid.New(),
		TeamID:     teamID,
		CreatorID:  new(creatorID),
		Title:      "Guide " + uuid.NewString(),
		Status:     models.StatusDraft,
		Visibility: visibility,
	}
	_, err := activityDB.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)
	return guide
}

func activityLogIDs(logs []*models.ActivityLog) []uuid.UUID {
	ids := make([]uuid.UUID, len(logs))
	for i, l := range logs {
		ids[i] = l.ID
	}
	return ids
}

func TestBunActivityLogsRepository_ListByTeam(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)
	teamID, owner := createTestOrgTeam(ctx, activityDB, t)
	other := insertTestUser(ctx, activityDB, t)

	teamGuide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)
	privateGuide := seedActivityGuide(t, teamID, owner, models.VisibilityPrivate)

	base := time.Now().Add(-time.Hour).UTC()
	oldest := newActivityLog(t, teamID, owner, teamGuide, base)
	middle := newActivityLog(t, teamID, owner, privateGuide, base.Add(time.Minute))
	newest := newActivityLog(t, teamID, owner, teamGuide, base.Add(2*time.Minute))
	orgLevel := newActivityLog(t, teamID, owner, teamGuide, base.Add(3*time.Minute))
	orgLevel.TeamID = nil
	for _, l := range []*models.ActivityLog{middle, oldest, newest, orgLevel} {
		_, err := repo.Insert(ctx, l)
		require.NoError(t, err)
	}

	otherTeamID, otherOwner := createTestOrgTeam(ctx, activityDB, t)
	otherTeamGuide := seedActivityGuide(t, otherTeamID, otherOwner, models.VisibilityTeam)
	_, err := repo.Insert(ctx, newActivityLog(t, otherTeamID, otherOwner, otherTeamGuide, time.Now()))
	require.NoError(t, err)

	cases := []struct {
		name        string
		teamID      uuid.UUID
		viewerID    string
		limit       int
		expectedIDs []uuid.UUID
	}{
		{
			name:        "orders newest first and includes the creator's private items",
			teamID:      teamID,
			viewerID:    owner,
			limit:       10,
			expectedIDs: []uuid.UUID{newest.ID, middle.ID, oldest.ID},
		},
		{
			name:        "hides other users' private items",
			teamID:      teamID,
			viewerID:    other,
			limit:       10,
			expectedIDs: []uuid.UUID{newest.ID, oldest.ID},
		},
		{
			name:        "applies the limit",
			teamID:      teamID,
			viewerID:    owner,
			limit:       2,
			expectedIDs: []uuid.UUID{newest.ID, middle.ID},
		},
		{
			name:        "returns an empty list for a team without activity",
			teamID:      uuid.New(),
			viewerID:    owner,
			limit:       10,
			expectedIDs: []uuid.UUID{},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logs, err := repo.ListByTeam(ctx, tt.teamID, tt.viewerID, tt.limit)

			require.NoError(t, err)
			assert.Equal(t, tt.expectedIDs, activityLogIDs(logs))
		})
	}
}

func TestBunActivityLogsRepository_Insert(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)

	cases := []struct {
		name             string
		existing         func(*models.ActivityLog) *models.ActivityLog
		expectedInserted bool
		expectedCount    int
	}{
		{
			name:             "inserts a new event",
			expectedInserted: true,
			expectedCount:    1,
		},
		{
			name: "ignores a retried event with the same id",
			existing: func(log *models.ActivityLog) *models.ActivityLog {
				retry := *log
				return &retry
			},
			expectedInserted: false,
			expectedCount:    1,
		},
		{
			name: "inserts a different event for the same guide",
			existing: func(log *models.ActivityLog) *models.ActivityLog {
				earlier := *log
				earlier.ID = uuid.New()
				return &earlier
			},
			expectedInserted: true,
			expectedCount:    2,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			teamID, owner := createTestOrgTeam(ctx, activityDB, t)
			log := newActivityLog(t, teamID, owner, seedActivityGuide(t, teamID, owner, models.VisibilityTeam), time.Now())
			if tt.existing != nil {
				_, err := repo.Insert(ctx, tt.existing(log))
				require.NoError(t, err)
			}

			inserted, err := repo.Insert(ctx, log)

			require.NoError(t, err)
			assert.Equal(t, tt.expectedInserted, inserted)
			logs, err := repo.ListByTeam(ctx, teamID, owner, 10)
			require.NoError(t, err)
			assert.Len(t, logs, tt.expectedCount)
		})
	}
}

func TestBunActivityLogsRepository_InsertOrMergeUpdate(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)
	window := models.ActivityUpdateMergeWindow

	editOf := func(log *models.ActivityLog, after time.Duration, title string) *models.ActivityLog {
		edit := *log
		edit.ID = uuid.New()
		edit.CreatedAt = log.CreatedAt.Add(after)
		edit.Metadata = models.ActivityMetadata{Guide: &models.ActivityGuideMetadata{Title: title}}
		return &edit
	}

	cases := []struct {
		name            string
		incoming        func(first *models.ActivityLog, other string, otherGuide *models.Guide) *models.ActivityLog
		expectedChanged bool
		expectMerged    bool
		expectedTitle   string
		expectedCount   int
	}{
		{
			name: "merges an edit within the window into the existing row",
			incoming: func(first *models.ActivityLog, _ string, _ *models.Guide) *models.ActivityLog {
				return editOf(first, window/2, "Docker Setup Guide")
			},
			expectedChanged: true,
			expectMerged:    true,
			expectedTitle:   "Docker Setup Guide",
			expectedCount:   1,
		},
		{
			name: "inserts an edit after the window",
			incoming: func(first *models.ActivityLog, _ string, _ *models.Guide) *models.ActivityLog {
				return editOf(first, window+time.Minute, "Docker Setup Guide")
			},
			expectedChanged: true,
			expectedTitle:   "Docker Setup Guide",
			expectedCount:   2,
		},
		{
			name: "inserts an edit by a different actor",
			incoming: func(first *models.ActivityLog, other string, _ *models.Guide) *models.ActivityLog {
				edit := editOf(first, window/2, "Docker Setup Guide")
				edit.ActorID = other
				return edit
			},
			expectedChanged: true,
			expectedTitle:   "Docker Setup Guide",
			expectedCount:   2,
		},
		{
			name: "inserts an edit of a different guide",
			incoming: func(first *models.ActivityLog, _ string, otherGuide *models.Guide) *models.ActivityLog {
				edit := editOf(first, window/2, "Other Guide")
				edit.TargetID = otherGuide.ID.String()
				return edit
			},
			expectedChanged: true,
			expectedTitle:   "Other Guide",
			expectedCount:   2,
		},
		{
			name: "ignores an older edit that arrives late",
			incoming: func(first *models.ActivityLog, _ string, _ *models.Guide) *models.ActivityLog {
				return editOf(first, -window/2, "Docker Se")
			},
			expectMerged:  true,
			expectedTitle: "Docker",
			expectedCount: 1,
		},
		{
			name: "ignores a redelivered event",
			incoming: func(first *models.ActivityLog, _ string, _ *models.Guide) *models.ActivityLog {
				retry := *first
				return &retry
			},
			expectMerged:  true,
			expectedTitle: "Docker",
			expectedCount: 1,
		},
		{
			name: "does not merge into other event types",
			incoming: func(first *models.ActivityLog, _ string, _ *models.Guide) *models.ActivityLog {
				first.EventType = models.ActivityGuideCreated
				_, err := activityDB.NewUpdate().Model(first).Column("event_type").WherePK().Exec(context.Background())
				require.NoError(t, err)
				return editOf(first, window/2, "Docker Setup Guide")
			},
			expectedChanged: true,
			expectedTitle:   "Docker Setup Guide",
			expectedCount:   2,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			teamID, owner := createTestOrgTeam(ctx, activityDB, t)
			other := insertTestUser(ctx, activityDB, t)
			guide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)
			otherGuide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)

			first := newActivityLog(t, teamID, owner, guide, time.Now().Add(-time.Hour).UTC().Truncate(time.Microsecond))
			first.EventType = models.ActivityGuideUpdated
			first.Metadata = models.ActivityMetadata{Guide: &models.ActivityGuideMetadata{Title: "Docker"}}
			_, changed, err := repo.InsertOrMergeUpdate(ctx, first, window)
			require.NoError(t, err)
			require.True(t, changed)

			incoming := tt.incoming(first, other, otherGuide)
			stored, changed, err := repo.InsertOrMergeUpdate(ctx, incoming, window)

			require.NoError(t, err)
			assert.Equal(t, tt.expectedChanged, changed)
			if tt.expectMerged {
				assert.Equal(t, first.ID, stored.ID)
			} else {
				assert.Equal(t, incoming.ID, stored.ID)
			}
			assert.Equal(t, tt.expectedTitle, stored.Metadata.Guide.Title)

			logs, err := repo.ListByTeam(ctx, teamID, owner, 10)
			require.NoError(t, err)
			assert.Len(t, logs, tt.expectedCount)
			assert.Equal(t, stored.ID, logs[0].ID, "the stored row is the newest entry")
		})
	}
}

func TestBunActivityLogsRepository_SyncGuideVisibility(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)

	cases := []struct {
		name                  string
		initial               models.Visibility
		target                models.Visibility
		expectedVisibleToPeer bool
	}{
		{
			name:                  "earlier rows follow the guide to private",
			initial:               models.VisibilityTeam,
			target:                models.VisibilityPrivate,
			expectedVisibleToPeer: false,
		},
		{
			name:                  "earlier rows follow the guide out of private",
			initial:               models.VisibilityPrivate,
			target:                models.VisibilityTeam,
			expectedVisibleToPeer: true,
		},
		{
			name:                  "syncing to the same visibility changes nothing",
			initial:               models.VisibilityTeam,
			target:                models.VisibilityTeam,
			expectedVisibleToPeer: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			teamID, owner := createTestOrgTeam(ctx, activityDB, t)
			peer := insertTestUser(ctx, activityDB, t)
			guide := seedActivityGuide(t, teamID, owner, tt.initial)
			_, err := repo.Insert(ctx, newActivityLog(t, teamID, owner, guide, time.Now()))
			require.NoError(t, err)

			require.NoError(t, repo.SyncGuideVisibility(ctx, guide.ID.String(), tt.target))

			peerLogs, err := repo.ListByTeam(ctx, teamID, peer, 10)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedVisibleToPeer, len(peerLogs) == 1)

			ownerLogs, err := repo.ListByTeam(ctx, teamID, owner, 10)
			require.NoError(t, err)
			require.Len(t, ownerLogs, 1)
			assert.Equal(t, tt.target, ownerLogs[0].Metadata.Guide.Visibility)
		})
	}
}

func TestBunActivityLogsRepository_ReferencedRowDeletion(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)

	cases := []struct {
		name   string
		delete func(*testing.T, *models.Guide, string)
		check  func(t *testing.T, guide *models.Guide, actorID string, log *models.ActivityLog)
	}{
		{
			name: "purging the guide keeps the row, its target and its title",
			delete: func(t *testing.T, guide *models.Guide, _ string) {
				_, err := activityDB.NewDelete().Model((*models.Guide)(nil)).Where("id = ?", guide.ID).Exec(ctx)
				require.NoError(t, err)
			},
			check: func(t *testing.T, guide *models.Guide, _ string, log *models.ActivityLog) {
				assert.Equal(t, guide.ID.String(), log.TargetID)
				assert.NotEmpty(t, log.Metadata.Guide.Title)
			},
		},
		{
			name: "deleting the actor keeps the row and its actor id",
			delete: func(t *testing.T, _ *models.Guide, actorID string) {
				_, err := activityDB.NewRaw("DELETE FROM users WHERE id = ?", actorID).Exec(ctx)
				require.NoError(t, err)
			},
			check: func(t *testing.T, guide *models.Guide, actorID string, log *models.ActivityLog) {
				assert.Equal(t, actorID, log.ActorID)
				assert.Equal(t, guide.ID.String(), log.TargetID)
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			teamID, owner := createTestOrgTeam(ctx, activityDB, t)
			actor := insertTestUser(ctx, activityDB, t)
			guide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)
			_, err := repo.Insert(ctx, newActivityLog(t, teamID, actor, guide, time.Now()))
			require.NoError(t, err)

			tt.delete(t, guide, actor)

			logs, err := repo.ListByTeam(ctx, teamID, owner, 10)
			require.NoError(t, err)
			require.Len(t, logs, 1)
			tt.check(t, guide, actor, logs[0])
		})
	}
}

func TestBunActivityLogsRepository_GetUserByID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)
	existingUser := insertTestUser(ctx, activityDB, t)

	cases := []struct {
		name         string
		userID       string
		expectedName string
		expectNil    bool
	}{
		{
			name:         "returns the user",
			userID:       existingUser,
			expectedName: "Test User",
		},
		{
			name:      "returns nil for an unknown user",
			userID:    uuid.NewString(),
			expectNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			user, err := repo.GetUserByID(ctx, tt.userID)

			require.NoError(t, err)
			if tt.expectNil {
				assert.Nil(t, user)
				return
			}
			require.NotNil(t, user)
			assert.Equal(t, tt.expectedName, user.Name)
		})
	}
}

func TestBunActivityLogsRepository_GetTeamOrganizationID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)
	owner := insertTestUser(ctx, activityDB, t)
	organizationID := insertTestOrganizationOwnedBy(ctx, activityDB, t, owner, nil)
	teamID := insertTestTeam(ctx, activityDB, t, organizationID, "Test Team", nil)

	cases := []struct {
		name     string
		teamID   uuid.UUID
		expected uuid.UUID
	}{
		{
			name:     "returns the team's organization",
			teamID:   uuid.MustParse(teamID),
			expected: uuid.MustParse(organizationID),
		},
		{
			name:     "returns nil for an unknown team",
			teamID:   uuid.New(),
			expected: uuid.Nil,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			organizationID, err := repo.GetTeamOrganizationID(ctx, tt.teamID)

			require.NoError(t, err)
			assert.Equal(t, tt.expected, organizationID)
		})
	}
}

func TestBunActivityLogsRepository_DeleteByTarget(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := activitylogs.NewBunActivityLogsRepository(activityDB)
	teamID, owner := createTestOrgTeam(ctx, activityDB, t)
	purgedGuide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)
	keptGuide := seedActivityGuide(t, teamID, owner, models.VisibilityTeam)

	created := newActivityLog(t, teamID, owner, purgedGuide, time.Now().Add(-time.Minute))
	deleted := newActivityLog(t, teamID, owner, purgedGuide, time.Now())
	deleted.EventType = models.ActivityGuideDeleted
	kept := newActivityLog(t, teamID, owner, keptGuide, time.Now())
	for _, l := range []*models.ActivityLog{created, deleted, kept} {
		_, err := repo.Insert(ctx, l)
		require.NoError(t, err)
	}

	require.NoError(t, repo.DeleteByTarget(ctx, models.ActivityTargetGuide, purgedGuide.ID.String()))

	logs, err := repo.ListByTeam(ctx, teamID, owner, 10)
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{kept.ID}, activityLogIDs(logs))
}
