package repositories_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	mediaassetsrepositories "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedSimpleStep(t *testing.T, db bun.IDB) uuid.UUID {
	t.Helper()

	userID := uuid.New().String()
	_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
	require.NoError(t, err)

	guide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: userID,
		Title:     "test guide",
		Status:    models.StatusDraft,
	}
	_, err = db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	step := &models.Step{
		ID:        uuid.New(),
		GuideID:   guide.ID,
		Type:      models.StepTypeInteraction,
		SortOrder: "a0",
	}
	_, err = db.NewInsert().Model(step).Exec(context.Background())
	require.NoError(t, err)

	return step.ID
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
				seedMediaAsset(t, db, stepID, "/uploads/first.png")
				seedMediaAsset(t, db, stepID, "/uploads/second.png")
				return stepID.String()
			},
			wantLen: 2,
		},
		{
			name: "only returns assets for the given step",
			setup: func(db *bun.DB) string {
				stepID1 := seedSimpleStep(t, db)
				stepID2 := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
				stepID := seedSimpleStep(t, db)
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
