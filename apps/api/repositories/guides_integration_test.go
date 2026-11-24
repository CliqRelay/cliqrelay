package repositories_test

import (
	"context"
	"fmt"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/repositories/guides"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedGuide(t *testing.T, db bun.IDB, userID, title string) *models.Guide {
	t.Helper()

	if userID == "" {
		userID = insertTestUser(context.Background(), db, t)
	}

	orgID := createTestOrganization(context.Background(), db, t)
	teamID := uuid.MustParse(insertTestTeam(context.Background(), db, t, orgID, "Test Team", nil))

	guide := &models.Guide{
		ID:         uuid.New(),
		TeamID:     teamID,
		CreatorID:  &userID,
		Title:      title,
		Status:     models.StatusDraft,
		Visibility: models.VisibilityPrivate,
	}

	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide
}

func createOrgWithTeams(t *testing.T, db bun.IDB, numTeams int) (string, []uuid.UUID) {
	t.Helper()

	orgID := createTestOrganization(context.Background(), db, t)

	teams := make([]uuid.UUID, 0, numTeams)
	for i := range numTeams {
		teamID := uuid.MustParse(insertTestTeam(context.Background(), db, t, orgID, fmt.Sprintf("Team %d", i+1), nil))
		teams = append(teams, teamID)
	}

	return orgID, teams
}

func seedGuideForTeam(t *testing.T, db bun.IDB, userID, title string, teamID uuid.UUID) *models.Guide {
	t.Helper()

	guide := &models.Guide{
		ID:        uuid.New(),
		TeamID:    teamID,
		CreatorID: new(userID),
		Title:     title,
		Status:    models.StatusDraft,
	}

	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide
}

func softDeleteGuide(t *testing.T, db bun.IDB, guideID uuid.UUID) {
	t.Helper()

	_, err := db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("deleted_at = CURRENT_TIMESTAMP").
		Set("status = 'deleted'").
		Where("id = ?", guideID).
		Exec(context.Background())
	require.NoError(t, err)
}

func publishGuide(t *testing.T, db bun.IDB, guideID uuid.UUID) {
	t.Helper()

	_, err := db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("status = 'published'").
		Set("visibility = 'team'").
		Set("published_at = CURRENT_TIMESTAMP").
		Where("id = ?", guideID).
		Exec(context.Background())
	require.NoError(t, err)
}

func archiveGuide(t *testing.T, db bun.IDB, guideID uuid.UUID) {
	t.Helper()

	_, err := db.NewUpdate().
		Model((*models.Guide)(nil)).
		Set("status = 'archived'").
		Set("archived_at = CURRENT_TIMESTAMP").
		Where("id = ?", guideID).
		Exec(context.Background())
	require.NoError(t, err)
}

func permanentlyDeleteGuide(t *testing.T, db bun.IDB, guideID uuid.UUID) {
	t.Helper()

	_, err := db.NewUpdate().
		Model((*models.Guide)(nil)).
		Where("id = ?", guideID).
		Set("purge_requested_at = CURRENT_TIMESTAMP").
		Exec(context.Background())
	require.NoError(t, err)
}

func TestBunGuidesRepository_Create(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name            string
		userID          string
		title           string
		description     *string
		wantDescription *string
	}{
		{
			name:            "creates guide with full details",
			userID:          uuid.New().String(),
			title:           "Test Guide",
			description:     new("A test description"),
			wantDescription: new("A test description"),
		},
		{
			name:            "creates guide without description",
			userID:          uuid.New().String(),
			title:           "No Description Guide",
			description:     nil,
			wantDescription: nil,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			ctx := context.Background()

			insertTestUserWithID(ctx, tx, t, tt.userID)

			teamID, _ := createTestOrgTeam(ctx, tx, t)
			guide, err := repo.Create(ctx, &types.CreateGuideDTO{
				TeamID:      teamID,
				CreatorID:   new(tt.userID),
				Title:       tt.title,
				Description: tt.description,
			})

			require.NoError(t, err)
			require.NotNil(t, guide)
			assert.NotEqual(t, uuid.Nil, guide.ID)
			require.NotNil(t, guide.CreatorID)
			assert.Equal(t, tt.userID, *guide.CreatorID)
			assert.Equal(t, tt.title, guide.Title)
			assert.Equal(t, models.StatusDraft, guide.Status)
			assert.NotZero(t, guide.CreatedAt)
			assert.NotZero(t, guide.UpdatedAt)
			assert.Nil(t, guide.DeletedAt)
			assert.Equal(t, tt.wantDescription, guide.Description)
		})
	}
}

func TestBunGuidesRepository_GetAll(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantLen int
	}{
		{
			name: "returns all guides for user",
			setup: func(db bun.IDB) string {
				guide1 := seedGuide(t, db, "", "Guide 1")
				seedGuide(t, db, *guide1.CreatorID, "Guide 2")
				return *guide1.CreatorID
			},
			wantLen: 2,
		},
		{
			name: "returns empty slice when no guides exist",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantLen: 0,
		},
		{
			name: "does not return other users guides",
			setup: func(db bun.IDB) string {
				seedGuide(t, db, "", "Other User Guide")
				return uuid.New().String()
			},
			wantLen: 0,
		},
		{
			name: "does not return deleted guides",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Delete")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 0,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			viewerID := tt.setup(tx)
			ctx := context.Background()

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{ViewerUserID: new(viewerID), AccessibleOnly: true})

			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)
			assert.Equal(t, tt.wantLen, total)
		})
	}
}

func TestBunGuidesRepository_GetAllByStatus(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		status  models.GuideStatus
		setup   func(bun.IDB) string
		wantLen int
	}{
		{
			name:   "returns archived guides",
			status: models.StatusArchived,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Archived")
				archiveGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 1,
		},
		{
			name:   "returns draft guides",
			status: models.StatusDraft,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Draft")
				return *guide.CreatorID
			},
			wantLen: 1,
		},
		{
			name:   "returns published guides",
			status: models.StatusPublished,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Published")
				publishGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 1,
		},
		{
			name:   "returns deleted guides",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 1,
		},
		{
			name:   "returns empty for non-existent user",
			status: models.StatusDraft,
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantLen: 0,
		},
		{
			name:   "filters out permanently deleted guides",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "PermDeleted")
				softDeleteGuide(t, db, guide.ID)
				permanentlyDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 0,
		},
		{
			name:   "keeps deleted guides pending purge",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "StillDeleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID
			},
			wantLen: 1,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			viewerID := tt.setup(tx)
			ctx := context.Background()

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{
				ViewerUserID:   new(viewerID),
				AccessibleOnly: true,
				Status:         new(tt.status),
			})

			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)
			assert.Equal(t, tt.wantLen, total)
		})
	}
}

func TestBunGuidesRepository_GetAllByStatusExcludesTrash(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name      string
		status    models.GuideStatus
		setup     func(bun.IDB) (viewerID string, wantID uuid.UUID)
		wantTotal int
	}{
		{
			name:   "excludes trashed guides when filtering by draft",
			status: models.StatusDraft,
			setup: func(db bun.IDB) (string, uuid.UUID) {
				trashed := seedGuide(t, db, "", "Trashed Guide")
				softDeleteGuide(t, db, trashed.ID)
				live := seedGuide(t, db, *trashed.CreatorID, "Live Draft")
				return *live.CreatorID, live.ID
			},
			wantTotal: 1,
		},
		{
			name:   "returns only trashed guides when filtering by deleted",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) (string, uuid.UUID) {
				trashed := seedGuide(t, db, "", "Trashed Guide")
				softDeleteGuide(t, db, trashed.ID)
				live := seedGuide(t, db, *trashed.CreatorID, "Live Draft")
				return *live.CreatorID, trashed.ID
			},
			wantTotal: 1,
		},
		{
			name:   "excludes guides with deleted status but null deleted_at when filtering by deleted",
			status: models.StatusDeleted,
			setup: func(db bun.IDB) (string, uuid.UUID) {
				trashed := seedGuide(t, db, "", "Trashed Guide")
				softDeleteGuide(t, db, trashed.ID)
				live := seedGuide(t, db, *trashed.CreatorID, "Live Draft")
				_, err := db.NewUpdate().
					Model((*models.Guide)(nil)).
					Set("status = 'deleted'").
					Where("id = ?", live.ID).
					Exec(context.Background())
				require.NoError(t, err)
				return *live.CreatorID, trashed.ID
			},
			wantTotal: 1,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			ctx := context.Background()

			viewerID, wantID := tt.setup(tx)

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{
				ViewerUserID:   new(viewerID),
				AccessibleOnly: true,
				Status:         new(tt.status),
			})
			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, total)
			require.Len(t, result, tt.wantTotal)
			assert.Equal(t, wantID, result[0].ID)
		})
	}
}

func TestBunGuidesRepository_GetByID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "returns guide by ID",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Find Me")
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "returns guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other Guide")
				return guide.ID.String()
			},
		},
		{
			name: "returns deleted guide (service layer filters status)",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Delete")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			found, err := repo.GetByID(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, found)
			} else {
				require.NotNil(t, found)
				assert.Equal(t, targetID, found.ID.String())
			}
		})
	}
}

func TestBunGuidesRepository_Update(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) *models.Guide
		dto     func(*models.Guide) *types.UpdateGuideDTO
		check   func(*testing.T, *models.Guide)
		wantNil bool
	}{
		{
			name: "updates guide title",
			setup: func(db bun.IDB) *models.Guide {
				return seedGuide(t, db, "", "Original Title")
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{
					ID:     guide.ID,
					TeamID: guide.TeamID,
					Title:  new("Updated Title"),
				}
			},
			check: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, "Updated Title", guide.Title)
			},
		},
		{
			name: "updates guide description",
			setup: func(db bun.IDB) *models.Guide {
				return seedGuide(t, db, "", "Title")
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{
					ID:          guide.ID,
					TeamID:      guide.TeamID,
					Description: new("Updated Description"),
				}
			},
			check: func(t *testing.T, guide *models.Guide) {
				require.NotNil(t, guide.Description)
				assert.Equal(t, "Updated Description", *guide.Description)
			},
		},
		{
			name: "updates multiple fields at once",
			setup: func(db bun.IDB) *models.Guide {
				return seedGuide(t, db, "", "Original")
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{
					ID:          guide.ID,
					TeamID:      guide.TeamID,
					Title:       new("New Title"),
					Description: new("New Desc"),
				}
			},
			check: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, "New Title", guide.Title)
				require.NotNil(t, guide.Description)
				assert.Equal(t, "New Desc", *guide.Description)
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) *models.Guide {
				return nil
			},
			dto: func(*models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{
					ID:     uuid.New(),
					TeamID: uuid.Nil,
					Title:  new("Nope"),
				}
			},
			wantNil: true,
		},
		{
			name: "updates guide even for different user",
			setup: func(db bun.IDB) *models.Guide {
				return seedGuide(t, db, "", "Original")
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{
					ID:     guide.ID,
					TeamID: guide.TeamID,
					Title:  new("Updated"),
				}
			},
			check: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, "Updated", guide.Title)
			},
		},
		{
			name: "returns the guide unchanged when no fields are set",
			setup: func(db bun.IDB) *models.Guide {
				return seedGuide(t, db, "", "Unchanged")
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{ID: guide.ID, TeamID: guide.TeamID}
			},
			check: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, "Unchanged", guide.Title)
			},
		},
		{
			name: "returns nil for soft-deleted guide",
			setup: func(db bun.IDB) *models.Guide {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return guide
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
				return &types.UpdateGuideDTO{ID: guide.ID, TeamID: guide.TeamID, Title: new("Nope")}
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			existing := tt.setup(tx)
			dto := tt.dto(existing)
			ctx := context.Background()

			updated, err := repo.Update(ctx, dto)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, updated)
				return
			}

			require.NotNil(t, updated)
			assert.Equal(t, dto.ID, updated.ID)
			tt.check(t, updated)
		})
	}
}

func TestBunGuidesRepository_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "soft deletes a guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Delete")
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "deletes guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				return guide.ID.String()
			},
		},
		{
			name: "is idempotent on already deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Delete Twice")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			deleted, err := repo.Delete(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, deleted)
				return
			}

			require.NotNil(t, deleted)
			assert.Equal(t, targetID, deleted.ID.String())
			assert.NotNil(t, deleted.DeletedAt)
			assert.Equal(t, models.StatusDeleted, deleted.Status)
		})
	}
}

func TestBunGuidesRepository_RestoreGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "restores a previously deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Restore")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "restores guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Not Deleted")
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			restored, err := repo.Restore(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, restored)
				return
			}

			require.NotNil(t, restored)
			assert.Equal(t, targetID, restored.ID.String())
			assert.Equal(t, models.StatusDraft, restored.Status)
			assert.NotNil(t, restored.RestoredAt)
			assert.Nil(t, restored.DeletedAt)
		})
	}
}

func TestBunGuidesRepository_PublishGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name           string
		setup          func(bun.IDB) string
		wantVisibility models.Visibility
		wantNil        bool
	}{
		{
			name: "publishes a draft guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Publish")
				return guide.ID.String()
			},
			wantVisibility: models.VisibilityTeam,
		},
		{
			name: "keeps a public guide public",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Public")
				_, err := db.NewUpdate().Model((*models.Guide)(nil)).
					Set("visibility = ?", models.VisibilityPublic).
					Where("id = ?", guide.ID).
					Exec(context.Background())
				require.NoError(t, err)
				return guide.ID.String()
			},
			wantVisibility: models.VisibilityPublic,
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "publishes guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				return guide.ID.String()
			},
			wantVisibility: models.VisibilityTeam,
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			published, err := repo.Publish(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, published)
				return
			}

			require.NotNil(t, published)
			assert.Equal(t, targetID, published.ID.String())
			assert.Equal(t, models.StatusPublished, published.Status)
			assert.Equal(t, tt.wantVisibility, published.Visibility)
			assert.NotNil(t, published.PublishedAt)
			assert.Nil(t, published.ArchivedAt)
			assert.Nil(t, published.DeletedAt)
		})
	}
}

func TestBunGuidesRepository_UnpublishGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "unpublishes a published guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Unpublish")
				publishGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "unpublishes guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				publishGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				publishGuide(t, db, guide.ID)
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			guide, err := repo.Unpublish(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, guide)
				return
			}

			require.NotNil(t, guide)
			assert.Equal(t, targetID, guide.ID.String())
			assert.Equal(t, models.StatusDraft, guide.Status)
			assert.Nil(t, guide.PublishedAt)
			assert.Nil(t, guide.ArchivedAt)
		})
	}
}

func TestBunGuidesRepository_ArchiveGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "archives a draft guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Archive")
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "archives guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			archived, err := repo.Archive(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, archived)
				return
			}

			require.NotNil(t, archived)
			assert.Equal(t, targetID, archived.ID.String())
			assert.Equal(t, models.StatusArchived, archived.Status)
			assert.NotNil(t, archived.ArchivedAt)
		})
	}
}

func TestBunGuidesRepository_UnarchiveGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "unarchives an archived guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Unarchive")
				archiveGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "unarchives guide even for different user",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Other")
				archiveGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			guide, err := repo.Unarchive(ctx, targetID)

			require.NoError(t, err)
			if tt.wantNil {
				assert.Nil(t, guide)
				return
			}

			require.NotNil(t, guide)
			assert.Equal(t, targetID, guide.ID.String())
			assert.Equal(t, models.StatusDraft, guide.Status)
			assert.Nil(t, guide.ArchivedAt)
			assert.NotNil(t, guide.RestoredAt)
		})
	}
}

func TestBunGuidesRepository_UpdateDuration(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name      string
		setup     func(bun.IDB) string
		wantTitle string
		wantNil   bool
	}{
		{
			name: "updates duration of a live guide",
			setup: func(db bun.IDB) string {
				return seedGuide(t, db, "", "Timed").ID.String()
			},
			wantTitle: "Timed",
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "returns nil for soft-deleted guide",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			updated, err := repo.UpdateDuration(ctx, targetID, 90)
			require.NoError(t, err)

			if tt.wantNil {
				assert.Nil(t, updated)
				return
			}

			require.NotNil(t, updated)
			assert.Equal(t, targetID, updated.ID.String())
			assert.Equal(t, 90, updated.DurationSeconds)
			assert.Equal(t, tt.wantTitle, updated.Title)
		})
	}
}

func TestBunGuidesRepository_PermanentlyDelete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) string
		wantNil bool
	}{
		{
			name: "marks a soft-deleted guide for purge",
			setup: func(db bun.IDB) string {
				guide := seedGuide(t, db, "", "To Purge")
				softDeleteGuide(t, db, guide.ID)
				return guide.ID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(bun.IDB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "returns nil for guide that is not soft-deleted",
			setup: func(db bun.IDB) string {
				return seedGuide(t, db, "", "Live").ID.String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			targetID := tt.setup(tx)
			ctx := context.Background()

			deleted, err := repo.PermanentlyDelete(ctx, targetID)
			require.NoError(t, err)

			if tt.wantNil {
				assert.Nil(t, deleted)
				return
			}

			require.NotNil(t, deleted)
			assert.Equal(t, targetID, deleted.ID.String())
			assert.NotNil(t, deleted.PurgeRequestedAt)
			assert.NotNil(t, deleted.DeletedAt)
		})
	}
}

func TestBunGuidesRepository_GetCountByOrganization(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name      string
		setup     func(bun.IDB) (orgID string, viewer *string)
		wantCount int
	}{
		{
			name: "counts guides across all teams in organization",
			setup: func(db bun.IDB) (string, *string) {
				orgID, teams := createOrgWithTeams(t, db, 2)
				userID := insertTestUser(context.Background(), db, t)
				seedGuideForTeam(t, db, userID, "Guide 1", teams[0])
				seedGuideForTeam(t, db, userID, "Guide 2", teams[1])
				return orgID, nil
			},
			wantCount: 2,
		},
		{
			name: "excludes guides from other organizations",
			setup: func(db bun.IDB) (string, *string) {
				orgA, teamsA := createOrgWithTeams(t, db, 1)
				_, teamsB := createOrgWithTeams(t, db, 1)
				userID := insertTestUser(context.Background(), db, t)
				seedGuideForTeam(t, db, userID, "Org A Guide", teamsA[0])
				seedGuideForTeam(t, db, userID, "Org B Guide", teamsB[0])
				return orgA, nil
			},
			wantCount: 1,
		},
		{
			name: "excludes deleted guides",
			setup: func(db bun.IDB) (string, *string) {
				orgID, teams := createOrgWithTeams(t, db, 1)
				userID := insertTestUser(context.Background(), db, t)
				guide := seedGuideForTeam(t, db, userID, "To Delete", teams[0])
				softDeleteGuide(t, db, guide.ID)
				seedGuideForTeam(t, db, userID, "Active", teams[0])
				return orgID, nil
			},
			wantCount: 1,
		},
		{
			name: "respects accessibility filter for viewer",
			setup: func(db bun.IDB) (string, *string) {
				orgID, teams := createOrgWithTeams(t, db, 1)
				viewer := insertTestUser(context.Background(), db, t)
				other := insertTestUser(context.Background(), db, t)
				seedGuideForTeam(t, db, viewer, "Viewer's guide", teams[0])

				private := seedGuideForTeam(t, db, other, "Private guide", teams[0])
				private.Visibility = models.VisibilityPrivate
				_, err := db.NewUpdate().Model(private).WherePK().Exec(context.Background())
				require.NoError(t, err)

				public := seedGuideForTeam(t, db, other, "Public guide", teams[0])
				public.Visibility = models.VisibilityPublic
				_, err = db.NewUpdate().Model(public).WherePK().Exec(context.Background())
				require.NoError(t, err)

				return orgID, new(viewer)
			},
			wantCount: 2,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			orgID, viewer := tt.setup(tx)
			ctx := context.Background()

			parsedOrgID, err := uuid.Parse(orgID)
			require.NoError(t, err)

			filter := &types.GuideFilter{OrganizationID: &parsedOrgID}
			if viewer != nil {
				filter.ViewerUserID = viewer
				filter.AccessibleOnly = true
			}

			count, err := repo.GetCount(ctx, filter)

			require.NoError(t, err)
			assert.Equal(t, tt.wantCount, count)
		})
	}
}

func TestBunGuidesRepository_CreateConcurrent_OrgLock(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	orgID := createTestOrganization(ctx, guidesDB, t)

	userID := insertTestUser(ctx, guidesDB, t)
	teamID := uuid.MustParse(insertTestTeam(ctx, guidesDB, t, orgID, "Concurrency Team", nil))

	t.Cleanup(func() {
		_, _ = guidesDB.NewRaw("DELETE FROM guides WHERE team_id = ?", teamID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM organization_teams WHERE id = ?", teamID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM organizations WHERE id = ?", orgID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM users WHERE id = ?", userID).Exec(ctx)
	})

	repo := guides.NewBunGuidesRepository(guidesDB)
	parsedOrgID, err := uuid.Parse(orgID)
	require.NoError(t, err)

	const workers = 5
	var wg sync.WaitGroup
	created := make(chan bool, workers)

	for range workers {
		wg.Go(func() {
			_ = repo.Tx(ctx, func(ctx context.Context, txRepo interfaces.GuidesRepository) error {
				if err := txRepo.LockOrganizationForUpdate(ctx, teamID); err != nil {
					return err
				}

				count, err := txRepo.GetCount(ctx, &types.GuideFilter{OrganizationID: &parsedOrgID})
				if err != nil {
					return err
				}
				if count >= 1 {
					return nil
				}

				if _, err := txRepo.Create(ctx, &types.CreateGuideDTO{
					TeamID:    teamID,
					CreatorID: &userID,
					Title:     "Concurrent Guide",
				}); err != nil {
					return err
				}

				created <- true
				return nil
			})
		})
	}
	wg.Wait()
	close(created)

	createdCount := 0
	for range created {
		createdCount++
	}

	assert.Equal(t, 1, createdCount, "organization row lock must serialize concurrent creates")

	count, err := repo.GetCount(ctx, &types.GuideFilter{OrganizationID: &parsedOrgID})
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestBunGuidesRepository_RestoreConcurrent_OrgLock(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	orgID := createTestOrganization(ctx, guidesDB, t)

	userID := insertTestUser(ctx, guidesDB, t)
	teamID := uuid.MustParse(insertTestTeam(ctx, guidesDB, t, orgID, "Concurrency Team", nil))

	const totalDeleted = 5
	guideIDs := make([]uuid.UUID, totalDeleted)
	for i := range guideIDs {
		guide := seedGuideForTeam(t, guidesDB, userID, "Concurrent Deleted Guide", teamID)
		softDeleteGuide(t, guidesDB, guide.ID)
		guideIDs[i] = guide.ID
	}

	t.Cleanup(func() {
		_, _ = guidesDB.NewRaw("DELETE FROM guides WHERE team_id = ?", teamID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM organization_teams WHERE id = ?", teamID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM organizations WHERE id = ?", orgID).Exec(ctx)
		_, _ = guidesDB.NewRaw("DELETE FROM users WHERE id = ?", userID).Exec(ctx)
	})

	repo := guides.NewBunGuidesRepository(guidesDB)
	parsedOrgID, err := uuid.Parse(orgID)
	require.NoError(t, err)

	const workers = totalDeleted
	const limit = 2
	var wg sync.WaitGroup
	restored := make(chan bool, workers)

	for w := range workers {
		wg.Go(func() {
			_ = repo.Tx(ctx, func(ctx context.Context, txRepo interfaces.GuidesRepository) error {
				if err := txRepo.LockOrganizationForUpdate(ctx, teamID); err != nil {
					return err
				}

				count, err := txRepo.GetCount(ctx, &types.GuideFilter{OrganizationID: &parsedOrgID})
				if err != nil {
					return err
				}
				if count >= limit {
					return nil
				}

				if _, err := txRepo.Restore(ctx, guideIDs[w].String()); err != nil {
					return err
				}

				restored <- true
				return nil
			})
		})
	}
	wg.Wait()
	close(restored)

	restoredCount := 0
	for range restored {
		restoredCount++
	}

	assert.Equal(t, limit, restoredCount, "organization row lock must serialize concurrent restores")

	count, err := repo.GetCount(ctx, &types.GuideFilter{OrganizationID: &parsedOrgID})
	require.NoError(t, err)
	assert.Equal(t, limit, count)
}

func TestBunGuidesRepository_ClientGuideID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name              string
		createSecond      bool
		sameCreator       bool
		wantErr           error
		wantReadBack      bool
		wantDistinctGuide bool
	}{
		{
			name:         "creates and reads back by client id",
			wantReadBack: true,
		},
		{
			name:         "rejects a duplicate client id for the same creator",
			createSecond: true,
			sameCreator:  true,
			wantErr:      constants.ErrDuplicateClientID,
		},
		{
			name:              "allows the same client id for another creator",
			createSecond:      true,
			wantDistinctGuide: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			ctx := context.Background()
			clientGuideID := uuid.New().String()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			userID := uuid.New().String()
			insertTestUserWithID(ctx, tx, t, userID)
			teamID, _ := createTestOrgTeam(ctx, tx, t)

			repo := guides.NewBunGuidesRepository(tx)

			created, err := repo.Create(ctx, &types.CreateGuideDTO{
				TeamID:        teamID,
				CreatorID:     new(userID),
				Title:         "Recorded Guide",
				ClientGuideID: new(clientGuideID),
			})
			require.NoError(t, err)
			require.NotNil(t, created.ClientGuideID)
			assert.Equal(t, clientGuideID, *created.ClientGuideID)

			if tt.wantReadBack {
				found, err := repo.GetByClientID(ctx, clientGuideID)
				require.NoError(t, err)
				require.NotNil(t, found)
				assert.Equal(t, created.ID, found.ID)
			}

			if !tt.createSecond {
				return
			}

			secondCreatorID := userID
			if !tt.sameCreator {
				secondCreatorID = uuid.New().String()
				insertTestUserWithID(ctx, tx, t, secondCreatorID)
			}

			second, err := repo.Create(ctx, &types.CreateGuideDTO{
				TeamID:        teamID,
				CreatorID:     new(secondCreatorID),
				Title:         "Recorded Guide",
				ClientGuideID: new(clientGuideID),
			})

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, second)
			if tt.wantDistinctGuide {
				assert.NotEqual(t, created.ID, second.ID, "the unique index is scoped to the creator")
			}
		})
	}
}
