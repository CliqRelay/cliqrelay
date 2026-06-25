package steps_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/uptrace/bun"

	"github.com/CliqRelay/cliqrelay/models"
	stepsrepositories "github.com/CliqRelay/cliqrelay/repositories/steps"
	"github.com/CliqRelay/cliqrelay/types"
)

func seedGuide(t *testing.T, db bun.IDB, userID, title string) *models.Guide {
	t.Helper()

	if userID == "" {
		userID = uuid.New().String()
		_, err := db.NewRaw("INSERT INTO users (id) VALUES (?)", userID).Exec(context.Background())
		require.NoError(t, err)
	}

	guide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: userID,
		Title:     title,
		Status:    models.StatusDraft,
	}

	_, err := db.NewInsert().Model(guide).Exec(context.Background())
	require.NoError(t, err)

	return guide
}

func seedStep(t *testing.T, db bun.IDB, guideID uuid.UUID, stepType models.StepType, sortOrder string, action models.StepAction, canvasContent *models.StepCanvasContent) *models.Step {
	t.Helper()

	step := &models.Step{
		ID:            uuid.New(),
		GuideID:       guideID,
		Type:          stepType,
		SortOrder:     sortOrder,
		Action:        &action,
		CanvasContent: canvasContent,
	}

	_, err := db.NewInsert().Model(step).Exec(context.Background())
	require.NoError(t, err)

	return step
}

func seedMediaAsset(t *testing.T, db bun.IDB, stepID uuid.UUID, suffix string) *models.MediaAsset {
	t.Helper()

	mediaAsset := &models.MediaAsset{
		ID:          uuid.New(),
		StepID:      stepID,
		StoragePath: "/path/to/" + suffix + ".png",
	}

	_, err := db.NewInsert().Model(mediaAsset).Exec(context.Background())
	require.NoError(t, err)

	return mediaAsset
}

func TestBunStepsRepository_Create(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) *types.CreateStepDTO
		check   func(*testing.T, *models.Step)
		wantErr bool
	}{
		{
			name: "creates step at beginning of empty guide",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				return &types.CreateStepDTO{
					GuideID: guide.ID,
					Action:  new(models.StepActionClick),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEqual(t, uuid.Nil, step.ID)
				assert.NotEmpty(t, step.SortOrder)
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionClick, *step.Action)
			},
		},
		{
			name: "appends step at end",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return &types.CreateStepDTO{
					GuideID: guide.ID,
					Action:  new(models.StepActionInput),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEmpty(t, step.SortOrder)
				assert.Greater(t, step.SortOrder, "a0")
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionInput, *step.Action)
			},
		},
		{
			name: "inserts before a specific step",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step2 := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionInput, nil)
				sid := step2.ID.String()
				return &types.CreateStepDTO{
					GuideID:            guide.ID,
					Action:             new(models.StepActionClick),
					InsertBeforeStepID: &sid,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEmpty(t, step.SortOrder)
				assert.Less(t, step.SortOrder, "a0")
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionClick, *step.Action)
			},
		},
		{
			name: "inserts after a specific step",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step1 := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				sid := step1.ID.String()
				return &types.CreateStepDTO{
					GuideID:           guide.ID,
					Action:            new(models.StepActionInput),
					InsertAfterStepID: &sid,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEmpty(t, step.SortOrder)
				assert.Greater(t, step.SortOrder, "a0")
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionInput, *step.Action)
			},
		},
		{
			name: "creates canvas step",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				heading := "Welcome"
				body := "This is a canvas step"
				return &types.CreateStepDTO{
					GuideID: guide.ID,
					Type:    models.StepTypeCanvas,
					CanvasContent: &models.StepCanvasContent{
						Type:        models.StepCanvasTypeCallout,
						HeadingText: &heading,
						BodyText:    &body,
					},
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEqual(t, uuid.Nil, step.ID)
				assert.NotEmpty(t, step.SortOrder)
				assert.Equal(t, models.StepTypeCanvas, step.Type)
				require.NotNil(t, step.CanvasContent)
				assert.Equal(t, models.StepCanvasTypeCallout, step.CanvasContent.Type)
				require.NotNil(t, step.CanvasContent.HeadingText)
				assert.Equal(t, "Welcome", *step.CanvasContent.HeadingText)
				require.NotNil(t, step.CanvasContent.BodyText)
				assert.Equal(t, "This is a canvas step", *step.CanvasContent.BodyText)
			},
		},
		{
			name: "inserts before first step when no previous exists",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step1 := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				sid := step1.ID.String()
				return &types.CreateStepDTO{
					GuideID:            guide.ID,
					Action:             new(models.StepActionInput),
					InsertBeforeStepID: &sid,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEmpty(t, step.SortOrder)
				assert.Less(t, step.SortOrder, "a0")
			},
		},
		{
			name: "inserts after last step when no next exists",
			setup: func(db *bun.DB) *types.CreateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step1 := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				sid := step1.ID.String()
				return &types.CreateStepDTO{
					GuideID:           guide.ID,
					Action:            new(models.StepActionInput),
					InsertAfterStepID: &sid,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.NotEmpty(t, step.SortOrder)
				assert.Greater(t, step.SortOrder, "a0")
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
			ctx := context.Background()
			dto := tt.setup(db)

			step, err := repo.Create(ctx, dto)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
				tt.check(t, step)
				assert.NotZero(t, step.CreatedAt)
				assert.NotZero(t, step.UpdatedAt)
			}
		})
	}
}

func TestBunStepsRepository_GetByID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantNil bool
	}{
		{
			name: "returns step",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return step.ID.String()
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
		{
			name: "returns step with media assets eagerly loaded",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				seedMediaAsset(t, db, step.ID, "get-by-id")
				return step.ID.String()
			},
			wantNil: false,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
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
					if tt.name == "returns step with media assets eagerly loaded" {
						require.Len(t, found.MediaAssets, 1)
						assert.Equal(t, "/path/to/get-by-id.png", found.MediaAssets[0].StoragePath)
					}
				}
			}
		})
	}
}

func TestBunStepsRepository_GetByGuideID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantLen int
	}{
		{
			name: "returns steps ordered by sort_order",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				seedStep(t, db, guide.ID, models.StepTypeInteraction, "b0", models.StepActionClick, nil)
				seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				seedStep(t, db, guide.ID, models.StepTypeInteraction, "c0", models.StepActionClick, nil)
				return guide.ID.String()
			},
			wantLen: 3,
		},
		{
			name: "returns empty slice for no steps",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				return guide.ID.String()
			},
			wantLen: 0,
		},
		{
			name: "only returns steps for the given guide",
			setup: func(db *bun.DB) string {
				guide1 := seedGuide(t, db, "", "Guide 1")
				seedStep(t, db, guide1.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				guide2 := seedGuide(t, db, "", "Guide 2")
				seedStep(t, db, guide2.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return guide1.ID.String()
			},
			wantLen: 1,
		},
		{
			name: "returns steps with media assets eagerly loaded",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				seedMediaAsset(t, db, step.ID, "get-by-guide-id")
				return guide.ID.String()
			},
			wantLen: 1,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
			guideID := tt.setup(db)
			ctx := context.Background()

			steps, err := repo.GetByGuideID(ctx, guideID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Len(t, steps, tt.wantLen)

				if tt.wantLen > 0 {
					for i := 1; i < len(steps); i++ {
						assert.LessOrEqual(t, steps[i-1].SortOrder, steps[i].SortOrder)
					}

					// For the "media assets" test case, verify MediaAssets is populated
					if tt.name == "returns steps with media assets eagerly loaded" {
						require.Len(t, steps[0].MediaAssets, 1)
						assert.Equal(t, "/path/to/get-by-guide-id.png", steps[0].MediaAssets[0].StoragePath)
					}
				}
			}
		})
	}
}

func TestBunStepsRepository_Update(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) *types.UpdateStepDTO
		check   func(*testing.T, *models.Step)
		wantErr bool
		wantNil bool
	}{
		{
			name: "updates action",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return &types.UpdateStepDTO{
					ID:     step.ID,
					Action: new(models.StepActionNavigation),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionNavigation, *step.Action)
			},
		},
		{
			name: "updates url",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return &types.UpdateStepDTO{
					ID:  step.ID,
					URL: new("https://example.com"),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.NotNil(t, step.URL)
				assert.Equal(t, "https://example.com", *step.URL)
			},
		},
		{
			name: "updates multiple fields",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return &types.UpdateStepDTO{
					ID:     step.ID,
					Action: new(models.StepActionInput),
					URL:    new("https://example.com"),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionInput, *step.Action)
				require.NotNil(t, step.URL)
				assert.Equal(t, "https://example.com", *step.URL)
			},
		},
		{
			name: "updates type and canvas content",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				canvasType := models.StepCanvasTypeCallout
				return &types.UpdateStepDTO{
					ID:   step.ID,
					Type: new(models.StepType(models.StepTypeCanvas)),
					CanvasContent: &models.StepCanvasContent{
						Type: canvasType,
					},
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.Equal(t, models.StepTypeCanvas, step.Type)
				require.NotNil(t, step.CanvasContent)
				assert.Equal(t, models.StepCanvasTypeCallout, step.CanvasContent.Type)
			},
		},
		{
			name: "preserves interaction fields when updating only notes",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				step.ActionText = new("Click me")
				step.URL = new("https://example.com")
				step.TargetElement = map[string]any{"selector": "#btn"}
				_, err := db.NewUpdate().Model(step).WherePK().Exec(context.Background())
				require.NoError(t, err)
				notes := "new notes"
				return &types.UpdateStepDTO{
					ID:    step.ID,
					Notes: &notes,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionClick, *step.Action)
				require.NotNil(t, step.ActionText)
				assert.Equal(t, "Click me", *step.ActionText)
				require.NotNil(t, step.URL)
				assert.Equal(t, "https://example.com", *step.URL)
				require.NotNil(t, step.TargetElement)
				assert.Equal(t, "#btn", step.TargetElement["selector"])
				require.NotNil(t, step.Notes)
				assert.Equal(t, "new notes", *step.Notes)
			},
		},
		{
			name: "preserves interaction fields when updating only url",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				step.ActionText = new("Click me")
				step.TargetElement = map[string]any{"selector": "#btn"}
				step.Notes = new("original notes")
				_, err := db.NewUpdate().Model(step).WherePK().Exec(context.Background())
				require.NoError(t, err)
				return &types.UpdateStepDTO{
					ID:  step.ID,
					URL: new("https://updated.com"),
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.NotNil(t, step.Action)
				assert.Equal(t, models.StepActionClick, *step.Action)
				require.NotNil(t, step.ActionText)
				assert.Equal(t, "Click me", *step.ActionText)
				require.NotNil(t, step.URL)
				assert.Equal(t, "https://updated.com", *step.URL)
				require.NotNil(t, step.TargetElement)
				assert.Equal(t, "#btn", step.TargetElement["selector"])
				require.NotNil(t, step.Notes)
				assert.Equal(t, "original notes", *step.Notes)
			},
		},
		{
			name: "preserves canvas content when updating only notes on canvas step",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				heading := "Welcome"
				body := "Hello world"
				step := seedStep(t, db, guide.ID, models.StepTypeCanvas, "a0", "", &models.StepCanvasContent{
					Type:        models.StepCanvasTypeCallout,
					HeadingText: &heading,
					BodyText:    &body,
				})
				notes := "canvas notes"
				return &types.UpdateStepDTO{
					ID:    step.ID,
					Notes: &notes,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				assert.Equal(t, models.StepTypeCanvas, step.Type)
				require.NotNil(t, step.CanvasContent)
				assert.Equal(t, models.StepCanvasTypeCallout, step.CanvasContent.Type)
				require.NotNil(t, step.CanvasContent.HeadingText)
				assert.Equal(t, "Welcome", *step.CanvasContent.HeadingText)
				require.NotNil(t, step.CanvasContent.BodyText)
				assert.Equal(t, "Hello world", *step.CanvasContent.BodyText)
				require.NotNil(t, step.Notes)
				assert.Equal(t, "canvas notes", *step.Notes)
			},
		},
		{
			name: "preserves media assets when updating notes",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				seedMediaAsset(t, db, step.ID, "screenshot")
				notes := "updated notes"
				return &types.UpdateStepDTO{
					ID:    step.ID,
					Notes: &notes,
				}
			},
			check: func(t *testing.T, step *models.Step) {
				require.Len(t, step.MediaAssets, 1)
				assert.Equal(t, "/path/to/screenshot.png", step.MediaAssets[0].StoragePath)
				require.NotNil(t, step.Notes)
				assert.Equal(t, "updated notes", *step.Notes)
			},
		},
		{
			name: "returns nil for non-existent",
			setup: func(db *bun.DB) *types.UpdateStepDTO {
				return &types.UpdateStepDTO{
					ID:     uuid.New(),
					Action: new(models.StepActionClick),
				}
			},
			wantNil: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
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

func TestBunStepsRepository_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB) string
		wantErr bool
		wantNil bool
	}{
		{
			name: "hard deletes a step",
			setup: func(db *bun.DB) string {
				guide := seedGuide(t, db, "", "Test Guide")
				step := seedStep(t, db, guide.ID, models.StepTypeInteraction, "a0", models.StepActionClick, nil)
				return step.ID.String()
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

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
			targetID := tt.setup(db)
			ctx := context.Background()

			err := repo.Delete(ctx, targetID)

			if tt.wantErr {
				assert.Error(t, err)
			} else if tt.wantNil {
				require.NoError(t, err)
			} else {
				require.NoError(t, err)

				// Verify step is actually deleted
				found, err := repo.GetByID(ctx, targetID)
				require.NoError(t, err)
				assert.Nil(t, found)
			}
		})
	}
}

func TestBunStepsRepository_Reorder(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*bun.DB, *stepsrepositories.BunStepsRepository) (guideID string, targetStepID string, prevStepID *string, nextStepID *string)
		check   func(*testing.T, []*models.Step)
		wantErr bool
	}{
		{
			name: "moves step between two others",
			setup: func(db *bun.DB, repo *stepsrepositories.BunStepsRepository) (string, string, *string, *string) {
				ctx := context.Background()
				guide := seedGuide(t, db, "", "Test Guide")

				step1, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionClick)})
				step2, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionInput)})
				step3, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionNavigation)})

				sid1 := step1.ID.String()
				sid2 := step2.ID.String()
				return guide.ID.String(), step3.ID.String(), &sid1, &sid2
			},
			check: func(t *testing.T, steps []*models.Step) {
				require.Len(t, steps, 3)
				assert.Equal(t, "click", string(*steps[0].Action))
				assert.Equal(t, "navigation", string(*steps[1].Action))
				assert.Equal(t, "input", string(*steps[2].Action))
			},
		},
		{
			name: "moves step to beginning",
			setup: func(db *bun.DB, repo *stepsrepositories.BunStepsRepository) (string, string, *string, *string) {
				ctx := context.Background()
				guide := seedGuide(t, db, "", "Test Guide")

				step1, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionClick)})
				step2, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionInput)})

				sid1 := step1.ID.String()
				return guide.ID.String(), step2.ID.String(), nil, &sid1
			},
			check: func(t *testing.T, steps []*models.Step) {
				require.Len(t, steps, 2)
				assert.Equal(t, "input", string(*steps[0].Action))
				assert.Equal(t, "click", string(*steps[1].Action))
			},
		},
		{
			name: "moves step to end",
			setup: func(db *bun.DB, repo *stepsrepositories.BunStepsRepository) (string, string, *string, *string) {
				ctx := context.Background()
				guide := seedGuide(t, db, "", "Test Guide")

				step1, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionClick)})
				step2, _ := repo.Create(ctx, &types.CreateStepDTO{GuideID: guide.ID, Action: new(models.StepActionInput)})

				sid2 := step2.ID.String()
				return guide.ID.String(), step1.ID.String(), &sid2, nil
			},
			check: func(t *testing.T, steps []*models.Step) {
				require.Len(t, steps, 2)
				assert.Equal(t, "input", string(*steps[0].Action))
				assert.Equal(t, "click", string(*steps[1].Action))
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := testDB
			repo := stepsrepositories.NewBunStepsRepository(db)
			guideID, targetStepID, prevStepID, nextStepID := tt.setup(db, repo)
			ctx := context.Background()

			steps, err := repo.Reorder(ctx, guideID, targetStepID, prevStepID, nextStepID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				tt.check(t, steps)
			}
		})
	}
}
