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

	orgID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
	require.NoError(t, err)

	teamID := uuid.New()
	_, err = db.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, fmt.Sprintf("Team %s", title), fmt.Sprintf("team-%s", title)).Exec(context.Background())
	require.NoError(t, err)

	guide := &models.Guide{
		ID:       uuid.New(),
		TeamID:   teamID,
		CreatorID: userID,
		Title:    title,
		Status:   models.StatusDraft,
	}
	_, err = db.NewInsert().Model(guide).Exec(context.Background())
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
				orgID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
				require.NoError(t, err)
				userID := uuid.New().String()
				_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)

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
				orgID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
				require.NoError(t, err)
				userID := uuid.New().String()
				_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)

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
				orgID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
				require.NoError(t, err)
				userID := uuid.New().String()
				_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)

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
				orgID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
				require.NoError(t, err)
				userID := uuid.New().String()
				_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)

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

			result, err := repo.GetAll(ctx, &types.GuideFilter{
				ViewerUserID: &userID,
				TeamID:       teamID,
			})

			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)

			if teamID != nil {
				for _, r := range result {
					assert.Equal(t, *teamID, r.TeamID, "returned guide should belong to the filtered team")
				}
			}
		})
	}
}
