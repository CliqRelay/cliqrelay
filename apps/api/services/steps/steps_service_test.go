package steps_test

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func testRedisClient() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
}

func TestStepsService_Create(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		req     *types.CreateStepRequest
		setup   func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		check   func(*testing.T, *models.Step)
		wantErr bool
	}{
		{
			name: "creates step successfully",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
				Action:  new(models.StepActionClick),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
			},
		},
		{
			name: "creates canvas step",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
				Type:    models.StepTypeCanvas,
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Type:      models.StepTypeCanvas,
						CanvasContent: &models.StepCanvasContent{
							Type: models.StepCanvasTypeCallout,
						},
					}, nil).
					Once()
			},
			check: func(t *testing.T, step *models.Step) {
				assert.Equal(t, models.StepTypeCanvas, step.Type)
				require.NotNil(t, step.CanvasContent)
				assert.Equal(t, models.StepCanvasTypeCallout, step.CanvasContent.Type)
			},
		},
		{
			name: "returns error when guide not found",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name: "propagates repository error",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			step, err := svc.Create(context.Background(), "00000000-0000-0000-0000-000000000001", tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
				if tt.check != nil {
					tt.check(t, step)
				} else {
					assert.Equal(t, models.StepActionClick, *step.Action)
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}

func TestStepsService_GetByID(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name    string
		stepID  string
		setup   func(*testing.T, *tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		wantErr bool
	}

	// Helper to create a success case setup with a fixed userID
	successCase := func(name string, withAssets bool) testCase {
		stepID := uuid.New().String()
		guideID := uuid.New()
		return testCase{
			name:   name,
			stepID: stepID,
			setup: func(t *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService) {
				storagePath := "uploads/guides/abc/steps/def/123"
				step := &models.Step{
					ID:        uuid.New(),
					GuideID:   guideID,
					SortOrder: "a0",
					Action:    new(models.StepActionClick),
				}
				if withAssets {
					step.MediaAssets = []*models.MediaAsset{
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath, MimeType: new("image/png")},
					}
				}
				mockStepsRepo.On("GetByID", mock.Anything, stepID).
					Return(step, nil).
					Once()
				if withAssets {
					mockPresignClient.On("GetURL", mock.Anything, "test-bucket", storagePath).
						Return("https://presigned.test/asset", nil).
						Once()
				}
			},
		}
	}

	cases := []testCase{
		successCase("returns step successfully", false),
		successCase("enriches media assets with presigned URLs", true),
		{
			name:   "returns error for empty stepID",
			stepID: "",
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			stepID: uuid.New().String(),
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			stepID: uuid.New().String(),
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(t, mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			step, err := svc.GetByID(context.Background(), tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
				if tt.stepID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
				assert.Equal(t, models.StepActionClick, *step.Action)
				for _, asset := range step.MediaAssets {
					if asset.StoragePath != "" {
						require.NotNil(t, asset.URL)
						assert.Equal(t, "https://presigned.test/asset", *asset.URL)
					}
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_GetByGuideID(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name    string
		guideID string
		setup   func(*testing.T, *tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		wantErr bool
		wantLen int
	}

	guideID := uuid.New()
	guideIDStr := guideID.String()

	successCase := func(name string, withAssets bool, wantLen int) testCase {
		return testCase{
			name:    name,
			guideID: guideIDStr,
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService) {
				storagePath := "uploads/guides/abc/steps/def/123"
				steps := make([]*models.Step, wantLen)
				for i := range steps {
					steps[i] = &models.Step{ID: uuid.New(), GuideID: guideID, SortOrder: string(rune('a'+i)) + "0", Action: new(models.StepActionClick)}
				}
				if withAssets && len(steps) > 0 {
					steps[0].MediaAssets = []*models.MediaAsset{
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath, MimeType: new("image/png")},
					}
					mockPresignClient.On("GetURL", mock.Anything, "test-bucket", storagePath).
						Return("https://presigned.test/asset", nil).
						Once()
				}
				mockStepsRepo.On("GetByGuideID", mock.Anything, guideIDStr).
					Return(steps, nil).
					Once()
			},
			wantLen: wantLen,
		}
	}

	cases := []testCase{
		successCase("returns steps successfully", false, 2),
		successCase("enriches media assets with presigned URLs", true, 1),
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: guideIDStr,
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByGuideID", mock.Anything, guideIDStr).
					Return([]*models.Step{}, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(t, mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			steps, err := svc.GetByGuideID(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, steps)
				if tt.guideID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidGuideID)
				}
			} else {
				require.NoError(t, err)
				assert.Len(t, steps, tt.wantLen)
				for _, step := range steps {
					for _, asset := range step.MediaAssets {
						if asset.StoragePath != "" {
							require.NotNil(t, asset.URL)
							assert.Equal(t, "https://presigned.test/asset", *asset.URL)
						}
					}
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_Update(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name    string
		stepID  string
		req     *types.UpdateStepRequest
		setup   func(*testing.T, *tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		check   func(*testing.T, *models.Step)
		wantErr bool
	}

	updateSuccessCase := func(name string, req *types.UpdateStepRequest, check func(*testing.T, *models.Step)) testCase {
		stepID := uuid.New().String()
		guideID := uuid.New()
		return testCase{
			name:   name,
			stepID: stepID,
			req:    req,
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    req.Action,
						Type: func() models.StepType {
							if req.Type != nil {
								return *req.Type
							}
							return ""
						}(),
						CanvasContent: req.CanvasContent,
					}, nil).
					Once()
			},
			check: check,
		}
	}

	cases := []testCase{
		updateSuccessCase("updates step successfully", &types.UpdateStepRequest{
			Action: new(models.StepActionNavigation),
		}, nil),
		updateSuccessCase("updates canvas content", &types.UpdateStepRequest{
			Type: new(models.StepType(models.StepTypeCanvas)),
			CanvasContent: &models.StepCanvasContent{
				Type: models.StepCanvasTypeCallout,
			},
		}, func(t *testing.T, step *models.Step) {
			assert.Equal(t, models.StepTypeCanvas, step.Type)
			require.NotNil(t, step.CanvasContent)
			assert.Equal(t, models.StepCanvasTypeCallout, step.CanvasContent.Type)
		}),
		{
			name:   "returns error for empty stepID",
			stepID: "",
			req:    &types.UpdateStepRequest{},
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
			},
			wantErr: true,
		},
		{
			name:   "returns error for invalid UUID",
			stepID: "not-a-uuid",
			req:    &types.UpdateStepRequest{},
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			stepID: uuid.New().String(),
			req: &types.UpdateStepRequest{
				Action: new(models.StepActionClick),
			},
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			stepID: uuid.New().String(),
			req: &types.UpdateStepRequest{
				Action: new(models.StepActionClick),
			},
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			tt.setup(t, mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			step, err := svc.Update(context.Background(), tt.stepID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
				if tt.stepID == "" || tt.stepID == "not-a-uuid" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
				if tt.check != nil {
					tt.check(t, step)
				} else {
					assert.Equal(t, models.StepActionNavigation, *step.Action)
				}
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_Delete(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name    string
		stepID  string
		setup   func(*testing.T, *tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockMediaAssetsRepository)
		wantErr bool
	}

	deleteSuccessCase := func(name string, withAssets bool) testCase {
		stepID := uuid.New().String()
		guideID := uuid.New()
		storagePath := "uploads/test/asset.png"
		return testCase{
			name:   name,
			stepID: stepID,
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				if withAssets {
					mockMediaAssetsRepo.On("GetByStepID", mock.Anything, stepID).
						Return([]*models.MediaAsset{
							{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath},
						}, nil).
						Once()
				} else {
					mockMediaAssetsRepo.On("GetByStepID", mock.Anything, stepID).
						Return([]*models.MediaAsset{}, nil).
						Once()
				}
				mockStepsRepo.On("Delete", mock.Anything, stepID).
					Return(nil).
					Once()
			},
		}
	}

	cases := []testCase{
		deleteSuccessCase("deletes step with assets", true),
		deleteSuccessCase("deletes step without assets", false),
		{
			name:   "returns error for empty stepID",
			stepID: "",
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockMediaAssetsRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when GetByStepID fails",
			stepID: uuid.New().String(),
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "returns error when repo delete fails",
			stepID: uuid.New().String(),
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				guideID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
					}, nil).
					Once()
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.Anything, mock.Anything).
					Return([]*models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.Anything).
					Return(assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			tt.setup(t, mockStepsRepo, mockGuidesRepo, mockMediaAssetsRepo)
			mockPresignClient := new(tests.MockPresignService)
			mockStorageService := new(tests.MockStorageService)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			err := svc.Delete(context.Background(), tt.stepID)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.stepID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}

func TestStepsService_Reorder(t *testing.T) {
	t.Parallel()

	type testCase struct {
		name         string
		guideID      string
		targetStepID string
		prevStepID   *string
		nextStepID   *string
		setup        func(*testing.T, *tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		wantErr      bool
		wantLen      int
	}

	successCase := func(name string, wantLen int, prevStepID *string, nextStepID *string) testCase {
		guideID := uuid.New().String()
		guideUUID := uuid.MustParse(guideID)
		return testCase{
			name:         name,
			guideID:      guideID,
			targetStepID: uuid.New().String(),
			prevStepID:   prevStepID,
			nextStepID:   nextStepID,
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				reorderedSteps := make([]*models.Step, wantLen)
				for i := range reorderedSteps {
					reorderedSteps[i] = &models.Step{ID: uuid.New(), GuideID: guideUUID, SortOrder: string(rune('a'+i)) + "0", Action: new(models.StepActionClick)}
				}
				mockStepsRepo.On("Reorder", mock.Anything, guideID, mock.Anything, mock.Anything, mock.Anything).
					Return(reorderedSteps, nil).
					Once()
			},
			wantLen: wantLen,
		}
	}

	cases := []testCase{
		successCase("reorders steps successfully", 2, new(uuid.New().String()), new(uuid.New().String())),
		successCase("reorders step to beginning", 1, nil, new(uuid.New().String())),
		successCase("reorders step to end", 1, new(uuid.New().String()), nil),
		{
			name:         "returns error for empty guide ID",
			guideID:      "",
			targetStepID: uuid.New().String(),
			setup: func(_ *testing.T, _ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			setup: func(_ *testing.T, mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("Reorder", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
					Return([]*models.Step{}, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(t, mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			steps, err := svc.Reorder(context.Background(), tt.guideID, tt.targetStepID, tt.prevStepID, tt.nextStepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, steps)
				if tt.guideID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidGuideID)
				}
			} else {
				require.NoError(t, err)
				assert.Len(t, steps, tt.wantLen)
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_Duplicate(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()
	stepID := uuid.New()
	newStepID := uuid.New()

	baseStep := &models.Step{
		ID:         stepID,
		GuideID:    guideID,
		SortOrder:  "a0",
		Type:       models.StepTypeInteraction,
		Action:     new(models.StepActionClick),
		ActionText: new("click me"),
		URL:        new("https://example.com"),
	}

	newStep := &models.Step{
		ID:         newStepID,
		GuideID:    guideID,
		SortOrder:  "b0",
		Type:       models.StepTypeInteraction,
		Action:     new(models.StepActionClick),
		ActionText: new("click me"),
		URL:        new("https://example.com"),
	}

	fetchedStep := &models.Step{
		ID:          newStepID,
		GuideID:     guideID,
		SortOrder:   "b0",
		Type:        models.StepTypeInteraction,
		Action:      new(models.StepActionClick),
		ActionText:  new("click me"),
		URL:         new("https://example.com"),
		MediaAssets: []*models.MediaAsset{},
	}

	cases := []struct {
		name    string
		stepID  string
		req     *types.DuplicateStepRequest
		setup   func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService, *tests.MockStorageService, *tests.MockMediaAssetsRepository)
		wantErr bool
	}{
		{
			name:   "success, no media assets",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(newStep, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, newStepID.String()).
					Return(fetchedStep, nil).
					Once()
			},
		},
		{
			name:   "success with 2 media assets and S3 copies",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				storagePaths := []string{
					"uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/123.webp",
					"uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/456.webp",
				}
				newPaths := []string{
					"uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/123.webp",
					"uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/456.webp",
				}

				stepWithAssets := &models.Step{
					ID:        stepID,
					GuideID:   guideID,
					SortOrder: "a0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePaths[0], MimeType: new("image/webp")},
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePaths[1], MimeType: new("image/png")},
					},
				}

				fetchedWithAssets := &models.Step{
					ID:        newStepID,
					GuideID:   guideID,
					SortOrder: "b0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: newStepID, StoragePath: newPaths[0], MimeType: new("image/webp")},
						{ID: uuid.New(), StepID: newStepID, StoragePath: newPaths[1], MimeType: new("image/png")},
					},
				}

				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(stepWithAssets, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[0], newPaths[0]).
					Return(nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[1], newPaths[1]).
					Return(nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{}, nil).
					Twice()
				mockStepsRepo.On("GetByID", mock.Anything, newStepID.String()).
					Return(fetchedWithAssets, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", newPaths[0]).
					Return("https://presigned.test/asset1", nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", newPaths[1]).
					Return("https://presigned.test/asset2", nil).
					Once()
			},
		},
		{
			name:   "thumbnails passed through",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				storagePath := "uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/123.webp"
				newPath := "uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/123.webp"
				thumbPath := "data:image/png;base64,iVBORw0KGgo="

				stepWithThumb := &models.Step{
					ID:        stepID,
					GuideID:   guideID,
					SortOrder: "a0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePath, MimeType: new("image/webp"), Thumbnail: &thumbPath},
					},
				}

				fetchedWithThumb := &models.Step{
					ID:        newStepID,
					GuideID:   guideID,
					SortOrder: "b0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: newStepID, StoragePath: newPath, MimeType: new("image/webp"), Thumbnail: &thumbPath},
					},
				}

				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(stepWithThumb, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePath, newPath).
					Return(nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateMediaAssetDTO) bool {
					return dto.Thumbnail != nil && *dto.Thumbnail == thumbPath
				})).
					Return(&models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, newStepID.String()).
					Return(fetchedWithThumb, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", newPath).
					Return("https://presigned.test/asset", nil).
					Once()
			},
		},
		{
			name:   "custom insert position override",
			stepID: stepID.String(),
			req: &types.DuplicateStepRequest{
				InsertBeforeStepID: new(uuid.New().String()),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateStepDTO) bool {
					return dto.InsertBeforeStepID != nil && dto.InsertAfterStepID == nil
				})).
					Return(newStep, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, newStepID.String()).
					Return(fetchedStep, nil).
					Once()
			},
		},
		{
			name:   "returns error for empty stepID",
			stepID: "",
			req:    &types.DuplicateStepRequest{},
			setup: func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "S3 copy failure mid-loop",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				storagePaths := []string{
					"uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/123.webp",
					"uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/456.webp",
				}
				newPaths := []string{
					"uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/123.webp",
					"uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/456.webp",
				}

				stepWithTwoAssets := &models.Step{
					ID:        stepID,
					GuideID:   guideID,
					SortOrder: "a0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePaths[0], MimeType: new("image/webp")},
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePaths[1], MimeType: new("image/webp")},
					},
				}

				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(stepWithTwoAssets, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[0], newPaths[0]).
					Return(nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[1], newPaths[1]).
					Return(assert.AnError).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "MediaAssetsRepo.Create failure",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				storagePath := "uploads/guides/" + guideID.String() + "/steps/" + stepID.String() + "/123.webp"
				newPath := "uploads/guides/" + guideID.String() + "/steps/" + newStepID.String() + "/123.webp"

				stepWithAsset := &models.Step{
					ID:        stepID,
					GuideID:   guideID,
					SortOrder: "a0",
					Type:      models.StepTypeInteraction,
					Action:    new(models.StepActionClick),
					MediaAssets: []*models.MediaAsset{
						{ID: uuid.New(), StepID: stepID, StoragePath: storagePath, MimeType: new("image/webp")},
					},
				}

				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(stepWithAsset, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePath, newPath).
					Return(nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			tt.setup(mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			step, err := svc.Duplicate(context.Background(), tt.stepID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
				if tt.stepID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidStepID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
			mockStorageService.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}
