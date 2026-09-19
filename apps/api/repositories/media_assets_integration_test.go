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
	mediaassetsrepositories "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedSimpleStep(t *testing.T, db bun.IDB) (uuid.UUID, uuid.UUID) {
	t.Helper()

	userID := insertTestUser(context.Background(), db, t)
	orgID := createTestOrganization(context.Background(), db, t)
	teamID := uuid.MustParse(insertTestTeam(context.Background(), db, t, orgID, "Test Team", nil))

	guide := &models.Guide{
		ID:        uuid.New(),
		TeamID:    teamID,
		CreatorID: &userID,
		Title:     "test guide",
		Status:    models.StatusDraft,
	}
	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	step := &models.Step{
		ID:        uuid.New(),
		GuideID:   guide.ID,
		Type:      models.StepTypeInteraction,
		SortOrder: "a0",
	}
	_, err = db.NewInsert().Model(step).Exec(context.Background())
	require.NoError(t, err)

	return step.ID, teamID
}

func TestBunMediaAssetsRepository_Create(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) *types.CreateMediaAssetDTO
		check   func(*testing.T, *models.MediaAsset)
		wantErr bool
	}{
		{
			name: "creates media asset with given fields",
			setup: func(db *bun.DB) *types.CreateMediaAssetDTO {
				stepID, _ := seedSimpleStep(t, db)
				return &types.CreateMediaAssetDTO{
					StepID:      stepID,
					StoragePath: "/uploads/test.png",
					MimeType:    new("image/png"),
					AltText:     new("Test image"),
					Height:      new(200),
					Width:       new(400),
					ByteSize:    new(1024),
				}
			},
			check: func(t *testing.T, a *models.MediaAsset) {
				assert.NotEqual(t, uuid.Nil, a.ID)
				assert.Equal(t, "/uploads/test.png", a.StoragePath)
				require.NotNil(t, a.MimeType)
				assert.Equal(t, "image/png", *a.MimeType)
				require.NotNil(t, a.AltText)
				assert.Equal(t, "Test image", *a.AltText)
				require.NotNil(t, a.Height)
				assert.Equal(t, 200, *a.Height)
				require.NotNil(t, a.Width)
				assert.Equal(t, 400, *a.Width)
				require.NotNil(t, a.ByteSize)
				assert.Equal(t, 1024, *a.ByteSize)
			},
		},
		{
			name: "enforces storage_path uniqueness",
			setup: func(db *bun.DB) *types.CreateMediaAssetDTO {
				stepID, _ := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID, "/uploads/unique.png")
				return &types.CreateMediaAssetDTO{
					StepID:      stepID,
					StoragePath: "/uploads/unique.png",
				}
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			ctx := context.Background()

			dto := tt.setup(db)

			mediaAsset, err := repo.Create(ctx, dto)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, mediaAsset)
				tt.check(t, mediaAsset)
				assert.NotZero(t, mediaAsset.CreatedAt)
				assert.NotZero(t, mediaAsset.UpdatedAt)
			}
		})
	}
}

func TestBunMediaAssetsRepository_GetByID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantNil bool
	}{
		{
			name: "returns media asset by ID",
			setup: func(db *bun.DB) string {
				stepID, _ := seedSimpleStep(t, db)
				asset := seedMediaAsset(t, db, stepID, "/uploads/get-by-id.png")
				return asset.ID.String()
			},
			wantNil: false,
		},
		{
			name: "returns nil for non-existent",
			setup: func(db *bun.DB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			targetID := tt.setup(db)
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

func TestBunMediaAssetsRepository_GetByStepID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantLen int
	}{
		{
			name: "returns all media assets for a step",
			setup: func(db *bun.DB) string {
				stepID, _ := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID, "/uploads/first.png")
				seedMediaAsset(t, db, stepID, "/uploads/second.png")
				return stepID.String()
			},
			wantLen: 2,
		},
		{
			name: "only returns assets for the given step",
			setup: func(db *bun.DB) string {
				stepID1, _ := seedSimpleStep(t, db)
				stepID2, _ := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID1, "/uploads/step1.png")
				seedMediaAsset(t, db, stepID2, "/uploads/step2.png")
				return stepID1.String()
			},
			wantLen: 1,
		},
		{
			name: "returns empty slice for no assets",
			setup: func(db *bun.DB) string {
				return uuid.New().String()
			},
			wantLen: 0,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			stepID := tt.setup(db)
			ctx := context.Background()

			assets, err := repo.GetByStepID(ctx, stepID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Len(t, assets, tt.wantLen)
			}
		})
	}
}

func TestBunMediaAssetsRepository_Update(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) *types.UpdateMediaAssetDTO
		check   func(*testing.T, *models.MediaAsset)
		wantErr bool
		wantNil bool
	}{
		{
			name: "updates alt_text",
			setup: func(db *bun.DB) *types.UpdateMediaAssetDTO {
				stepID, _ := seedSimpleStep(t, db)
				asset := seedMediaAsset(t, db, stepID, "/uploads/alt-text.png")
				return &types.UpdateMediaAssetDTO{
					ID:      asset.ID,
					AltText: new("Updated alt text"),
				}
			},
			check: func(t *testing.T, a *models.MediaAsset) {
				require.NotNil(t, a.AltText)
				assert.Equal(t, "Updated alt text", *a.AltText)
			},
		},
		{
			name: "updates mime_type",
			setup: func(db *bun.DB) *types.UpdateMediaAssetDTO {
				stepID, _ := seedSimpleStep(t, db)
				asset := seedMediaAsset(t, db, stepID, "/uploads/mime-type.png")
				return &types.UpdateMediaAssetDTO{
					ID:       asset.ID,
					MimeType: new("image/webp"),
				}
			},
			check: func(t *testing.T, a *models.MediaAsset) {
				require.NotNil(t, a.MimeType)
				assert.Equal(t, "image/webp", *a.MimeType)
			},
		},
		{
			name: "updates multiple fields",
			setup: func(db *bun.DB) *types.UpdateMediaAssetDTO {
				stepID, _ := seedSimpleStep(t, db)
				asset := seedMediaAsset(t, db, stepID, "/uploads/multi.png")
				return &types.UpdateMediaAssetDTO{
					ID:       asset.ID,
					AltText:  new("Multi alt"),
					MimeType: new("image/jpeg"),
					Height:   new(300),
					Width:    new(600),
					ByteSize: new(2048),
				}
			},
			check: func(t *testing.T, a *models.MediaAsset) {
				require.NotNil(t, a.AltText)
				assert.Equal(t, "Multi alt", *a.AltText)
				require.NotNil(t, a.MimeType)
				assert.Equal(t, "image/jpeg", *a.MimeType)
				require.NotNil(t, a.Height)
				assert.Equal(t, 300, *a.Height)
				require.NotNil(t, a.Width)
				assert.Equal(t, 600, *a.Width)
				require.NotNil(t, a.ByteSize)
				assert.Equal(t, 2048, *a.ByteSize)
			},
		},
		{
			name: "returns nil for non-existent",
			setup: func(db *bun.DB) *types.UpdateMediaAssetDTO {
				return &types.UpdateMediaAssetDTO{
					ID:      uuid.New(),
					AltText: new("Should not exist"),
				}
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			dto := tt.setup(db)
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

func TestBunMediaAssetsRepository_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantNil bool
	}{
		{
			name: "hard deletes a media asset",
			setup: func(db *bun.DB) string {
				stepID, _ := seedSimpleStep(t, db)
				asset := seedMediaAsset(t, db, stepID, "/uploads/to-delete.png")
				return asset.ID.String()
			},
			wantNil: false,
		},
		{
			name: "returns nil for non-existent",
			setup: func(db *bun.DB) string {
				return uuid.New().String()
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			targetID := tt.setup(db)
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

				found, err := repo.GetByID(ctx, targetID)
				require.NoError(t, err)
				assert.Nil(t, found)
			}
		})
	}
}

func TestBunMediaAssetsRepository_DeleteByStepID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name        string
		setup       func(*bun.DB) uuid.UUID
		wantRemoved int
	}{
		{
			name: "returns the deleted rows",
			setup: func(db *bun.DB) uuid.UUID {
				stepID, _ := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID, "/uploads/delete-by-step-1.png")
				seedMediaAsset(t, db, stepID, "/uploads/delete-by-step-2.png")
				return stepID
			},
			wantRemoved: 2,
		},
		{
			name: "returns empty slice when nothing to delete",
			setup: func(db *bun.DB) uuid.UUID {
				stepID, _ := seedSimpleStep(t, db)
				return stepID
			},
			wantRemoved: 0,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			ctx := context.Background()
			stepID := tt.setup(db)

			removed, err := repo.DeleteByStepID(ctx, stepID.String())

			require.NoError(t, err)
			assert.NotNil(t, removed)
			assert.Len(t, removed, tt.wantRemoved)
			remaining, err := repo.GetByStepID(ctx, stepID.String())
			require.NoError(t, err)
			assert.Empty(t, remaining)
		})
	}
}

func TestBunMediaAssetsRepository_LockStepForUpdate(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) uuid.UUID
		wantErr error
	}{
		{
			name: "locks an existing step",
			setup: func(db *bun.DB) uuid.UUID {
				stepID, _ := seedSimpleStep(t, db)
				return stepID
			},
		},
		{
			name:    "returns not found for a missing step",
			setup:   func(*bun.DB) uuid.UUID { return uuid.New() },
			wantErr: constants.ErrStepNotFound,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			stepID := tt.setup(db)

			err := repo.Tx(context.Background(), func(ctx context.Context, txRepo interfaces.MediaAssetsRepository) error {
				return txRepo.LockStepForUpdate(ctx, stepID)
			})

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
			} else {
				require.NoError(t, err)
			}
		})
	}
}

func TestBunMediaAssetsRepository_ReplaceConcurrent_StepLock(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name  string
		setup func(*bun.DB) uuid.UUID
	}{
		{
			name: "step with no asset ends with exactly one row",
			setup: func(db *bun.DB) uuid.UUID {
				stepID, _ := seedSimpleStep(t, db)
				return stepID
			},
		},
		{
			name: "step with an existing asset ends with exactly one row",
			setup: func(db *bun.DB) uuid.UUID {
				stepID, _ := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID, fmt.Sprintf("/uploads/concurrent-%s-old.png", stepID))
				return stepID
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			ctx := context.Background()
			stepID := tt.setup(db)

			const workers = 5
			var wg sync.WaitGroup
			errs := make(chan error, workers)
			for i := range workers {
				path := fmt.Sprintf("/uploads/concurrent-%s-%d.png", stepID, i)
				wg.Go(func() {
					errs <- repo.Tx(ctx, func(ctx context.Context, txRepo interfaces.MediaAssetsRepository) error {
						if err := txRepo.LockStepForUpdate(ctx, stepID); err != nil {
							return err
						}
						if _, err := txRepo.DeleteByStepID(ctx, stepID.String()); err != nil {
							return err
						}
						_, err := txRepo.Create(ctx, &types.CreateMediaAssetDTO{StepID: stepID, StoragePath: path})
						return err
					})
				})
			}
			wg.Wait()
			close(errs)

			for err := range errs {
				require.NoError(t, err)
			}
			assets, err := repo.GetByStepID(ctx, stepID.String())
			require.NoError(t, err)
			assert.Len(t, assets, 1, "step row lock must serialize concurrent replaces")
		})
	}
}

func TestBunMediaAssetsRepository_Tx(t *testing.T) {
	t.Parallel()

	const oldPath = "/uploads/tx-old.png"
	const newPath = "/uploads/tx-new.png"

	cases := []struct {
		name        string
		callbackErr error
		wantPath    string
	}{
		{
			name:     "commits delete and create together",
			wantPath: newPath,
		},
		{
			name:        "rolls back when callback fails",
			callbackErr: assert.AnError,
			wantPath:    oldPath,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			ctx := context.Background()
			stepID, _ := seedSimpleStep(t, db)
			seedMediaAsset(t, db, stepID, fmt.Sprintf("%s-%s", oldPath, stepID))

			err := repo.Tx(ctx, func(ctx context.Context, txRepo interfaces.MediaAssetsRepository) error {
				if _, err := txRepo.DeleteByStepID(ctx, stepID.String()); err != nil {
					return err
				}
				if _, err := txRepo.Create(ctx, &types.CreateMediaAssetDTO{StepID: stepID, StoragePath: fmt.Sprintf("%s-%s", newPath, stepID)}); err != nil {
					return err
				}
				return tt.callbackErr
			})

			if tt.callbackErr != nil {
				require.ErrorIs(t, err, tt.callbackErr)
			} else {
				require.NoError(t, err)
			}
			assets, err := repo.GetByStepID(ctx, stepID.String())
			require.NoError(t, err)
			require.Len(t, assets, 1)
			assert.Equal(t, fmt.Sprintf("%s-%s", tt.wantPath, stepID), assets[0].StoragePath)
		})
	}
}

func TestBunMediaAssetsRepository_ExistingStoragePaths(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name  string
		setup func(*bun.DB) (input []string, want []string)
	}{
		{
			name: "returns only the paths that have a row",
			setup: func(db *bun.DB) ([]string, []string) {
				stepID, _ := seedSimpleStep(t, db)
				kept := "uploads/guides/g/steps/" + stepID.String() + "/1.webp"
				alsoKept := "uploads/guides/g/steps/" + stepID.String() + "/2.webp"
				seedMediaAsset(t, db, stepID, kept)
				seedMediaAsset(t, db, stepID, alsoKept)
				return []string{kept, "uploads/guides/g/steps/x/orphan.webp", alsoKept}, []string{kept, alsoKept}
			},
		},
		{
			name: "returns empty slice for empty input",
			setup: func(*bun.DB) ([]string, []string) {
				return nil, []string{}
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := mediaAssetsDB
			repo := mediaassetsrepositories.NewBunMediaAssetsRepository(db)
			input, want := tt.setup(db)

			existing, err := repo.ExistingStoragePaths(context.Background(), input)

			require.NoError(t, err)
			assert.ElementsMatch(t, want, existing)
		})
	}
}
