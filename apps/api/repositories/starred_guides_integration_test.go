package repositories_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/repositories/starred_guides"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedTeamWithGuide(t *testing.T, db bun.IDB, userID, title string) (*models.Guide, uuid.UUID) {
	t.Helper()

	orgID := createTestOrganization(context.Background(), db, t)

	teamID := uuid.MustParse(insertTestTeam(context.Background(), db, t, orgID, fmt.Sprintf("Team %s", title), nil))

	guide := &models.Guide{
		ID:        uuid.New(),
		TeamID:    teamID,
		CreatorID: new(userID),
		Title:     title,
		Status:    models.StatusDraft,
	}
	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide, teamID
}

func starGuide(t *testing.T, db bun.IDB, userID string, guideID uuid.UUID) {
	t.Helper()
	_, err := db.NewInsert().
		Model(&models.StarredGuide{UserID: userID, GuideID: guideID}).
		On("CONFLICT (user_id, guide_id) DO NOTHING").
		Exec(context.Background())
	require.NoError(t, err)
}

func TestBunStarredGuidesRepository_GetAll_TeamFilter(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) (string, *uuid.UUID, int)
		wantLen int
	}{
		{
			name: "returns starred guides scoped to team",
			setup: func(db *bun.DB) (string, *uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)

				guideA, teamA := seedTeamWithGuide(t, db, userID, "Guide A")
				guideB, _ := seedTeamWithGuide(t, db, userID, "Guide B")

				starGuide(t, db, userID, guideA.ID)
				starGuide(t, db, userID, guideB.ID)

				return userID, &teamA, 1
			},
			wantLen: 1,
		},
		{
			name: "excludes starred guides from other teams",
			setup: func(db *bun.DB) (string, *uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)

				guideA, teamA := seedTeamWithGuide(t, db, userID, "Guide A")
				guideB, _ := seedTeamWithGuide(t, db, userID, "Guide B")

				starGuide(t, db, userID, guideA.ID)
				starGuide(t, db, userID, guideB.ID)

				return userID, &teamA, 1
			},
			wantLen: 1,
		},
		{
			name: "returns empty when no starred guides for team",
			setup: func(db *bun.DB) (string, *uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)

				_, teamA := seedTeamWithGuide(t, db, userID, "Guide A")
				guideB, _ := seedTeamWithGuide(t, db, userID, "Guide B")

				starGuide(t, db, userID, guideB.ID)

				return userID, &teamA, 0
			},
			wantLen: 0,
		},
		{
			name: "returns all starred guides when team filter is nil",
			setup: func(db *bun.DB) (string, *uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)

				guideA, _ := seedTeamWithGuide(t, db, userID, "Guide A")
				guideB, _ := seedTeamWithGuide(t, db, userID, "Guide B")

				starGuide(t, db, userID, guideA.ID)
				starGuide(t, db, userID, guideB.ID)

				return userID, nil, 2
			},
			wantLen: 2,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := guidesDB
			repo := starred_guides.NewBunStarredGuidesRepository(db)
			userID, teamID, _ := tt.setup(db)
			ctx := context.Background()

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{
				ViewerUserID: &userID,
				TeamID:       teamID,
			})

			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)
			assert.Equal(t, tt.wantLen, total)

			if teamID != nil {
				for _, r := range result {
					assert.Equal(t, *teamID, r.TeamID, "returned guide should belong to the filtered team")
				}
			}
		})
	}
}

func TestBunStarredGuidesRepository_GetAllByStatusExcludesTrash(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name   string
		status models.GuideStatus
		setup  func(bun.IDB) (viewerID string, wantID uuid.UUID, wantTotal int)
	}{
		{
			name:   "excludes trashed guides when filtering by draft",
			status: models.StatusDraft,
			setup: func(db bun.IDB) (string, uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)
				live, _ := seedTeamWithGuide(t, db, userID, "Live Guide")
				trashed, _ := seedTeamWithGuide(t, db, userID, "Trashed Guide")
				starGuide(t, db, userID, live.ID)
				starGuide(t, db, userID, trashed.ID)
				softDeleteGuide(t, db, trashed.ID)
				return userID, live.ID, 1
			},
		},
		{
			name:   "returns only trashed guides when filtering by deleted",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) (string, uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)
				live, _ := seedTeamWithGuide(t, db, userID, "Live Guide")
				trashed, _ := seedTeamWithGuide(t, db, userID, "Trashed Guide")
				starGuide(t, db, userID, live.ID)
				starGuide(t, db, userID, trashed.ID)
				softDeleteGuide(t, db, trashed.ID)
				return userID, trashed.ID, 1
			},
		},
		{
			name:   "excludes guides with deleted status but null deleted_at when filtering by deleted",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) (string, uuid.UUID, int) {
				userID := insertTestUser(context.Background(), db, t)
				live, _ := seedTeamWithGuide(t, db, userID, "Live Guide")
				trashed, _ := seedTeamWithGuide(t, db, userID, "Trashed Guide")
				starGuide(t, db, userID, live.ID)
				starGuide(t, db, userID, trashed.ID)
				softDeleteGuide(t, db, trashed.ID)
				_, err := db.NewUpdate().
					Model((*models.Guide)(nil)).
					Set("status = 'deleted'").
					Where("id = ?", live.ID).
					Exec(context.Background())
				require.NoError(t, err)
				return userID, trashed.ID, 1
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := starred_guides.NewBunStarredGuidesRepository(tx)
			ctx := context.Background()

			viewerID, wantID, wantTotal := tt.setup(tx)

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{
				ViewerUserID: new(viewerID),
				Status:       new(tt.status),
			})
			require.NoError(t, err)
			assert.Equal(t, wantTotal, total)
			require.Len(t, result, wantTotal)
			assert.Equal(t, wantID, result[0].ID)
		})
	}
}
