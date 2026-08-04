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

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/repositories/guides"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedGuide(t *testing.T, db bun.IDB, userID, title string) *models.Guide {
	t.Helper()

	if userID == "" {
		userID = uuid.New().String()
		_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
		require.NoError(t, err)
	}

	orgID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
	require.NoError(t, err)
	teamID := uuid.New()
	_, err = db.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, "Test Team", "test-team").Exec(context.Background())
	require.NoError(t, err)

	guide := &models.Guide{
		ID:        uuid.New(),
		TeamID:    teamID,
		CreatorID: new(userID),
		Title:     title,
		Status:    models.StatusDraft,
	}

	_, err = db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide
}

func createOrgWithTeams(t *testing.T, db bun.IDB, numTeams int) (string, []uuid.UUID) {
	t.Helper()

	orgID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(context.Background())
	require.NoError(t, err)

	teams := make([]uuid.UUID, 0, numTeams)
	for i := 0; i < numTeams; i++ {
		teamID := uuid.New()
		_, err = db.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, fmt.Sprintf("Team %d", i+1), fmt.Sprintf("team-%d", i+1)).Exec(context.Background())
		require.NoError(t, err)
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
		name    string
		userID  string
		title   string
		desc    *string
		wantErr bool
	}{
		{
			name:    "creates guide with full details",
			userID:  uuid.New().String(),
			title:   "Test Guide",
			desc:    new("A test description"),
			wantErr: false,
		},
		{
			name:    "creates guide without description",
			userID:  uuid.New().String(),
			title:   "No Description Guide",
			desc:    nil,
			wantErr: false,
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

			_, userErr := tx.NewRaw("INSERT INTO users (id) VALUES (?)", tt.userID).Exec(ctx)
			require.NoError(t, userErr)

			teamID, _ := createTestOrgTeam(ctx, tx, t)
			guide, err := repo.Create(ctx, &types.CreateGuideDTO{
				TeamID:      teamID,
				CreatorID:   new(tt.userID),
				Title:       tt.title,
				Description: tt.desc,
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
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

				if tt.desc != nil {
					require.NotNil(t, guide.Description)
					assert.Equal(t, *tt.desc, *guide.Description)
				} else {
					assert.Nil(t, guide.Description)
				}
			}
		})
	}
}

func TestBunGuidesRepository_GetAll(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (string, int)
		wantErr bool
		wantLen int
	}{
		{
			name: "returns all guides for user",
			setup: func(db bun.IDB) (string, int) {
				guide1 := seedGuide(t, db, "", "Guide 1")
				seedGuide(t, db, *guide1.CreatorID, "Guide 2")
				return *guide1.CreatorID, 2
			},
			wantLen: 2,
		},
		{
			name: "returns empty slice when no guides exist",
			setup: func(db bun.IDB) (string, int) {
				return uuid.New().String(), 0
			},
			wantLen: 0,
		},
		{
			name: "does not return other users guides",
			setup: func(db bun.IDB) (string, int) {
				seedGuide(t, db, "", "Other User Guide")
				return uuid.New().String(), 0
			},
			wantLen: 0,
		},
		{
			name: "does not return deleted guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "To Delete")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, 0
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
			userID, _ := tt.setup(tx)
			ctx := context.Background()

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{ViewerUserID: &userID, AccessibleOnly: true})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Len(t, result, tt.wantLen)
				assert.Equal(t, tt.wantLen, total)
			}
		})
	}
}

func TestBunGuidesRepository_GetAllByStatus(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (string, int)
		wantLen int
	}{
		{
			name: "returns archived guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "Archived")
				archiveGuide(t, db, guide.ID)
				return *guide.CreatorID, 1
			},
			wantLen: 1,
		},
		{
			name: "returns draft guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "Draft")
				return *guide.CreatorID, 1
			},
			wantLen: 1,
		},
		{
			name: "returns published guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "Published")
				publishGuide(t, db, guide.ID)
				return *guide.CreatorID, 1
			},
			wantLen: 1,
		},
		{
			name: "returns deleted guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, 1
			},
			wantLen: 1,
		},
		{
			name: "returns empty for non-existent user",
			setup: func(db bun.IDB) (string, int) {
				return uuid.New().String(), 0
			},
			wantLen: 0,
		},
		{
			name: "filters out permanently deleted guides",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "PermDeleted")
				softDeleteGuide(t, db, guide.ID)
				permanentlyDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, 0
			},
			wantLen: 0,
		},
		{
			name: "keeps deleted guides pending purge",
			setup: func(db bun.IDB) (string, int) {
				guide := seedGuide(t, db, "", "StillDeleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, 1
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
			userID, _ := tt.setup(tx)
			ctx := context.Background()

			var status models.GuideStatus
			switch tt.name {
			case "returns archived guides":
				status = models.StatusArchived
			case "returns draft guides":
				status = models.StatusDraft
			case "returns published guides":
				status = models.StatusPublished
			case "returns deleted guides", "filters out permanently deleted guides", "keeps deleted guides pending purge":
				status = models.StatusDeleted
			default:
				status = models.StatusDraft
			}

			result, total, err := repo.GetAll(ctx, &types.GuideFilter{ViewerUserID: &userID, AccessibleOnly: true, Status: &status})

			require.NoError(t, err)
			assert.Len(t, result, tt.wantLen)
			assert.Equal(t, tt.wantLen, total)
		})
	}
}

func TestBunGuidesRepository_GetByID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantErr bool
		wantNil bool
	}{
		{
			name: "returns guide by ID",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Find Me")
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
			wantNil: false,
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "returns guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other Guide")
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
			wantNil: false,
		},
		{
			name: "returns deleted guide (service layer filters status)",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Delete")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
			wantNil: false,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			found, err := repo.GetByID(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				if tt.wantNil {
					assert.Nil(t, found)
				} else {
					require.NotNil(t, found)
					assert.Equal(t, targetID, found.ID.String())
				}
			}
		})
	}
}

func TestBunGuidesRepository_Update(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, existing *models.Guide)
		dto     func(*models.Guide) *types.UpdateGuideDTO
		check   func(*testing.T, *models.Guide)
		wantErr bool
		wantNil bool
	}{
		{
			name: "updates guide title",
			setup: func(db bun.IDB) (string, *models.Guide) {
				guide := seedGuide(t, db, "", "Original Title")
				return *guide.CreatorID, guide
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
			setup: func(db bun.IDB) (string, *models.Guide) {
				guide := seedGuide(t, db, "", "Title")
				return *guide.CreatorID, guide
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
			setup: func(db bun.IDB) (string, *models.Guide) {
				guide := seedGuide(t, db, "", "Original")
				return *guide.CreatorID, guide
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
			setup: func(db bun.IDB) (string, *models.Guide) {
				return uuid.New().String(), nil
			},
			dto: func(guide *models.Guide) *types.UpdateGuideDTO {
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
			setup: func(db bun.IDB) (string, *models.Guide) {
				guide := seedGuide(t, db, "", "Original")
				return uuid.New().String(), guide
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
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			tx, err := guidesDB.Begin()
			require.NoError(t, err)
			t.Cleanup(func() { _ = tx.Rollback() })

			repo := guides.NewBunGuidesRepository(tx)
			_, existing := tt.setup(tx)
			dto := tt.dto(existing)
			ctx := context.Background()

			updated, err := repo.Update(ctx, dto)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, updated)
			} else {
				require.NoError(t, err)
				require.NotNil(t, updated)
				assert.Equal(t, dto.ID, updated.ID)
				tt.check(t, updated)
			}
		})
	}
}

func TestBunGuidesRepository_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantErr bool
		wantNil bool
	}{
		{
			name: "soft deletes a guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Delete")
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
			wantNil: false,
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "deletes guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other")
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
			wantNil: false,
		},
		{
			name: "is idempotent on already deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Delete Twice")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			deleted, err := repo.Delete(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, deleted)
			} else {
				require.NoError(t, err)
				require.NotNil(t, deleted)
				assert.Equal(t, targetID, deleted.ID.String())
				assert.NotNil(t, deleted.DeletedAt)
				assert.Equal(t, models.GuideStatus("deleted"), deleted.Status)
			}
		})
	}
}

func TestBunGuidesRepository_RestoreGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantErr bool
		wantNil bool
	}{
		{
			name: "restores a previously deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Restore")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "restores guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				userID := uuid.New().String()
				guide := seedGuide(t, db, "", "Other")
				softDeleteGuide(t, db, guide.ID)
				return userID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Not Deleted")
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			restored, err := repo.Restore(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, restored)
			} else {
				require.NoError(t, err)
				require.NotNil(t, restored)
				assert.Equal(t, targetID, restored.ID.String())
				assert.Equal(t, models.StatusDraft, restored.Status)
				assert.NotNil(t, restored.RestoredAt)
				assert.Nil(t, restored.DeletedAt)
			}
		})
	}
}

func TestBunGuidesRepository_PublishGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantErr bool
		wantNil bool
	}{
		{
			name: "publishes a draft guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Publish")
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "publishes guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other")
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			published, err := repo.Publish(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, published)
			} else {
				require.NoError(t, err)
				require.NotNil(t, published)
				assert.Equal(t, targetID, published.ID.String())
				assert.Equal(t, models.StatusPublished, published.Status)
				assert.Equal(t, models.VisibilityTeam, published.Visibility)
				assert.NotNil(t, published.PublishedAt)
				assert.Nil(t, published.ArchivedAt)
				assert.Nil(t, published.DeletedAt)
			}
		})
	}
}

func TestBunGuidesRepository_UnpublishGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantNil bool
	}{
		{
			name: "unpublishes a published guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Unpublish")
				publishGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "unpublishes guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other")
				publishGuide(t, db, guide.ID)
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Deleted")
				publishGuide(t, db, guide.ID)
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			guide, err := repo.Unpublish(ctx, targetID)

			if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, targetID, guide.ID.String())
				assert.Equal(t, models.StatusDraft, guide.Status)
				assert.Nil(t, guide.PublishedAt)
				assert.Nil(t, guide.ArchivedAt)
			}
		})
	}
}

func TestBunGuidesRepository_ArchiveGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantErr bool
		wantNil bool
	}{
		{
			name: "archives a draft guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Archive")
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "archives guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other")
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			archived, err := repo.Archive(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, archived)
			} else {
				require.NoError(t, err)
				require.NotNil(t, archived)
				assert.Equal(t, targetID, archived.ID.String())
				assert.Equal(t, models.StatusArchived, archived.Status)
				assert.NotNil(t, archived.ArchivedAt)
			}
		})
	}
}

func TestBunGuidesRepository_UnarchiveGuide(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (userID string, targetID string, teamID string)
		wantNil bool
	}{
		{
			name: "unarchives an archived guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "To Unarchive")
				archiveGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for non-existent guide",
			setup: func(db bun.IDB) (string, string, string) {
				return uuid.New().String(), uuid.New().String(), uuid.New().String()
			},
			wantNil: true,
		},
		{
			name: "unarchives guide even for different user",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Other")
				archiveGuide(t, db, guide.ID)
				return uuid.New().String(), guide.ID.String(), guide.TeamID.String()
			},
		},
		{
			name: "returns nil for deleted guide",
			setup: func(db bun.IDB) (string, string, string) {
				guide := seedGuide(t, db, "", "Deleted")
				softDeleteGuide(t, db, guide.ID)
				return *guide.CreatorID, guide.ID.String(), guide.TeamID.String()
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
			_, targetID, _ := tt.setup(tx)
			ctx := context.Background()

			guide, err := repo.Unarchive(ctx, targetID)

			if tt.wantNil {
				require.NoError(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, targetID, guide.ID.String())
				assert.Equal(t, models.StatusDraft, guide.Status)
				assert.Nil(t, guide.ArchivedAt)
				assert.NotNil(t, guide.RestoredAt)
			}
		})
	}
}

func TestBunGuidesRepository_GetCountByOrganization(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(bun.IDB) (orgID string, viewer *string, wantCount int)
		wantErr bool
	}{
		{
			name: "counts guides across all teams in organization",
			setup: func(db bun.IDB) (string, *string, int) {
				orgID, teams := createOrgWithTeams(t, db, 2)
				userID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)
				seedGuideForTeam(t, db, userID, "Guide 1", teams[0])
				seedGuideForTeam(t, db, userID, "Guide 2", teams[1])
				return orgID, nil, 2
			},
		},
		{
			name: "excludes guides from other organizations",
			setup: func(db bun.IDB) (string, *string, int) {
				orgA, teamsA := createOrgWithTeams(t, db, 1)
				_, teamsB := createOrgWithTeams(t, db, 1)
				userID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)
				seedGuideForTeam(t, db, userID, "Org A Guide", teamsA[0])
				seedGuideForTeam(t, db, userID, "Org B Guide", teamsB[0])
				return orgA, nil, 1
			},
		},
		{
			name: "excludes deleted guides",
			setup: func(db bun.IDB) (string, *string, int) {
				orgID, teams := createOrgWithTeams(t, db, 1)
				userID := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
				require.NoError(t, err)
				guide := seedGuideForTeam(t, db, userID, "To Delete", teams[0])
				softDeleteGuide(t, db, guide.ID)
				seedGuideForTeam(t, db, userID, "Active", teams[0])
				return orgID, nil, 1
			},
		},
		{
			name: "respects accessibility filter for viewer",
			setup: func(db bun.IDB) (string, *string, int) {
				orgID, teams := createOrgWithTeams(t, db, 1)
				viewer := uuid.New().String()
				other := uuid.New().String()
				_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", viewer).Exec(context.Background())
				require.NoError(t, err)
				_, err = db.NewRaw("INSERT INTO users (id) VALUES (?)", other).Exec(context.Background())
				require.NoError(t, err)
				seedGuideForTeam(t, db, viewer, "Viewer's guide", teams[0])

				private := seedGuideForTeam(t, db, other, "Private guide", teams[0])
				private.Visibility = models.VisibilityPrivate
				_, err = db.NewUpdate().Model(private).WherePK().Exec(context.Background())
				require.NoError(t, err)

				public := seedGuideForTeam(t, db, other, "Public guide", teams[0])
				public.Visibility = models.VisibilityPublic
				_, err = db.NewUpdate().Model(public).WherePK().Exec(context.Background())
				require.NoError(t, err)

				return orgID, new(viewer), 2
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
			orgID, viewer, wantCount := tt.setup(tx)
			ctx := context.Background()

			parsedOrgID, err := uuid.Parse(orgID)
			require.NoError(t, err)

			filter := &types.GuideFilter{OrganizationID: &parsedOrgID}
			if viewer != nil {
				filter.ViewerUserID = viewer
				filter.AccessibleOnly = true
			}

			count, err := repo.GetCount(ctx, filter)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, wantCount, count)
			}
		})
	}
}

func TestBunGuidesRepository_CreateConcurrent_OrgLock(t *testing.T) {
	t.Parallel()

	ctx := context.Background()

	orgID := uuid.New().String()
	_, err := guidesDB.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(ctx)
	require.NoError(t, err)

	userID := uuid.New().String()
	_, err = guidesDB.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(ctx)
	require.NoError(t, err)

	teamID := uuid.New()
	_, err = guidesDB.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, "Concurrency Team", "concurrency-team").Exec(ctx)
	require.NoError(t, err)

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

	orgID := uuid.New().String()
	_, err := guidesDB.NewRaw("INSERT INTO organizations (id) VALUES (?)", orgID).Exec(ctx)
	require.NoError(t, err)

	userID := uuid.New().String()
	_, err = guidesDB.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(ctx)
	require.NoError(t, err)

	teamID := uuid.New()
	_, err = guidesDB.NewRaw("INSERT INTO organization_teams (id, organization_id, name, slug) VALUES (?, ?, ?, ?)", teamID, orgID, "Concurrency Team", "concurrency-team-restore").Exec(ctx)
	require.NoError(t, err)

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
