package repositories_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	guideviews "github.com/CliqRelay/cliqrelay/repositories/guide_views"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedGuideForViews(t *testing.T, db bun.IDB, teamID uuid.UUID, userID string, durationSeconds int) *models.Guide {
	t.Helper()

	guide := &models.Guide{
		ID:              uuid.New(),
		TeamID:          teamID,
		CreatorID:       new(userID),
		Title:           "Guide " + uuid.NewString(),
		Status:          models.StatusPublished,
		DurationSeconds: durationSeconds,
	}
	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide
}

func TestBunGuideViewsRepository_GetTimeSavedByTeam(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := guideviews.NewBunGuideViewsRepository(guideViewsDB)

	recordView := func(t *testing.T, teamID uuid.UUID, guide *models.Guide, viewedAt time.Time) {
		t.Helper()
		require.NoError(t, repo.Create(ctx, &types.CreateGuideViewDTO{
			TeamID:          teamID,
			GuideID:         guide.ID,
			DurationSeconds: guide.DurationSeconds,
			ViewedAt:        viewedAt,
		}))
	}

	cases := []struct {
		name  string
		since func() *time.Time
		setup func(*testing.T, uuid.UUID, string)
		want  map[int]int
	}{
		{
			name: "groups view counts by the snapshotted duration",
			setup: func(t *testing.T, teamID uuid.UUID, userID string) {
				guideA := seedGuideForViews(t, guideViewsDB, teamID, userID, 60)
				guideB := seedGuideForViews(t, guideViewsDB, teamID, userID, 600)
				recordView(t, teamID, guideA, time.Now())
				recordView(t, teamID, guideA, time.Now())
				recordView(t, teamID, guideB, time.Now())
			},
			want: map[int]int{60: 2, 600: 1},
		},
		{
			name: "later edits to a guide do not rewrite recorded views",
			setup: func(t *testing.T, teamID uuid.UUID, userID string) {
				guide := seedGuideForViews(t, guideViewsDB, teamID, userID, 60)
				recordView(t, teamID, guide, time.Now())

				_, err := guideViewsDB.NewUpdate().
					Model((*models.Guide)(nil)).
					Set("duration_seconds = ?", 900).
					Where("id = ?", guide.ID).
					Exec(ctx)
				require.NoError(t, err)
			},
			want: map[int]int{60: 1},
		},
		{
			name: "views of soft deleted guides still count",
			setup: func(t *testing.T, teamID uuid.UUID, userID string) {
				guide := seedGuideForViews(t, guideViewsDB, teamID, userID, 120)
				recordView(t, teamID, guide, time.Now())

				_, err := guideViewsDB.NewUpdate().
					Model((*models.Guide)(nil)).
					Set("deleted_at = ?", time.Now()).
					Where("id = ?", guide.ID).
					Exec(ctx)
				require.NoError(t, err)
			},
			want: map[int]int{120: 1},
		},
		{
			name:  "excludes views older than since",
			since: func() *time.Time { cutoff := time.Now().Add(-time.Hour); return &cutoff },
			setup: func(t *testing.T, teamID uuid.UUID, userID string) {
				guide := seedGuideForViews(t, guideViewsDB, teamID, userID, 300)
				recordView(t, teamID, guide, time.Now().Add(-48*time.Hour))
				recordView(t, teamID, guide, time.Now())
			},
			want: map[int]int{300: 1},
		},
		{
			name:  "team without views returns nothing",
			setup: func(*testing.T, uuid.UUID, string) {},
			want:  map[int]int{},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			teamID, userID := createTestOrgTeam(ctx, guideViewsDB, t)
			tt.setup(t, teamID, userID)

			var since *time.Time
			if tt.since != nil {
				since = tt.since()
			}

			// Act
			stats, err := repo.GetTimeSavedByTeam(ctx, teamID, since)

			// Assert
			require.NoError(t, err)
			got := make(map[int]int, len(stats))
			for _, stat := range stats {
				got[stat.DurationSeconds] = stat.ViewCount
			}
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestBunGuideViewsRepository_GetCountByTeam(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	repo := guideviews.NewBunGuideViewsRepository(guideViewsDB)

	// Arrange
	teamID, userID := createTestOrgTeam(ctx, guideViewsDB, t)
	guide := seedGuideForViews(t, guideViewsDB, teamID, userID, 45)
	viewerID := uuid.MustParse(userID)

	require.NoError(t, repo.Create(ctx, &types.CreateGuideViewDTO{
		TeamID:          teamID,
		GuideID:         guide.ID,
		ViewerID:        &viewerID,
		DurationSeconds: guide.DurationSeconds,
		ViewedAt:        time.Now(),
	}))

	// Act
	count, err := repo.GetCountByTeam(ctx, teamID, nil)

	// Assert
	require.NoError(t, err)
	assert.Equal(t, 1, count)

	var stored models.GuideView
	require.NoError(t, guideViewsDB.NewSelect().Model(&stored).Where("guide_id = ?", guide.ID).Scan(ctx))
	assert.Equal(t, 45, stored.DurationSeconds)
	require.NotNil(t, stored.ViewerID)
	assert.Equal(t, userID, *stored.ViewerID)
}
