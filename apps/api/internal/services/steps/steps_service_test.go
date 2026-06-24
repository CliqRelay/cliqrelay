package steps_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/internal/constants"
	"github.com/CliqRelay/cliqrelay/internal/models"
	stepsservice "github.com/CliqRelay/cliqrelay/internal/services/steps"
	"github.com/CliqRelay/cliqrelay/internal/tests"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

func testRedisClient() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
}

func TestStepsService_Create(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		userID  string
		req     *types.CreateStepRequest
		setup   func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		check   func(*testing.T, *models.Step)
		wantErr bool
	}{
		{
			name:   "creates step successfully",
			userID: uuid.New().String(),
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
				Action:  new(models.StepActionClick),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
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
			name:   "creates canvas step",
			userID: uuid.New().String(),
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
				Type:    models.StepTypeCanvas,
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
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
			name:   "returns error for empty user ID",
			userID: "",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:   "returns error for whitespace user ID",
			userID: "   ",
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:   "returns error when guide not found",
			userID: uuid.New().String(),
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			userID: uuid.New().String(),
			req: &types.CreateStepRequest{
				GuideID: uuid.New(),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
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
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

			step, err := svc.Create(context.Background(), tt.userID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
				if tt.userID == "" || tt.userID == "   " {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
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

	cases := []struct {
		name    string
		stepID  string
		setup   func(*tests.MockStepsRepository, *tests.MockPresignService)
		wantErr bool
	}{
		{
			name:   "returns step successfully",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
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
			name:   "enriches media assets with presigned URLs",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockPresignClient *tests.MockPresignService) {
				storagePath := "uploads/guides/abc/steps/def/123"
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionClick),
						MediaAssets: []*models.MediaAsset{
							{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath, MimeType: new("image/png")},
						},
					}, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", storagePath).
					Return("https://presigned.test/asset", nil).
					Once()
			},
		},
		{
			name:    "returns error for empty stepID",
			stepID:  "",
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
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
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(mockStepsRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, nil, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

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
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_GetByGuideID(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		userID  string
		guideID string
		setup   func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		wantErr bool
		wantLen int
	}{
		{
			name:    "returns steps successfully",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "b0", Action: new(models.StepActionInput)},
					}, nil).
					Once()
			},
			wantLen: 2,
		},
		{
			name:    "enriches media assets with presigned URLs",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService) {
				storagePath := "uploads/guides/abc/steps/def/123"
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{ID: uuid.New(), CreatorID: uuid.New().String(), Title: "Test Guide", Status: models.StatusDraft}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{
						{
							ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0",
							MediaAssets: []*models.MediaAsset{
								{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath, MimeType: new("image/png")},
							},
						},
					}, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", storagePath).
					Return("https://presigned.test/asset", nil).
					Once()
			},
			wantLen: 1,
		},
		{
			name:    "returns error for empty user ID",
			userID:  "",
			guideID: uuid.New().String(),
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:    "returns error for empty guide ID",
			userID:  uuid.New().String(),
			guideID: "",
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			userID:  uuid.New().String(),
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
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
			tt.setup(mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

			steps, err := svc.GetByGuideID(context.Background(), tt.userID, tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, steps)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
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

	cases := []struct {
		name    string
		stepID  string
		req     *types.UpdateStepRequest
		setup   func(*tests.MockStepsRepository, *tests.MockPresignService)
		check   func(*testing.T, *models.Step)
		wantErr bool
	}{
		{
			name:   "updates step successfully",
			stepID: uuid.New().String(),
			req: &types.UpdateStepRequest{
				Action: new(models.StepActionNavigation),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
					Return(&models.Step{
						ID:        uuid.New(),
						GuideID:   uuid.New(),
						SortOrder: "a0",
						Action:    new(models.StepActionNavigation),
					}, nil).
					Once()
			},
		},
		{
			name:   "updates canvas content",
			stepID: uuid.New().String(),
			req: &types.UpdateStepRequest{
				Type: new(models.StepType(models.StepTypeCanvas)),
				CanvasContent: &models.StepCanvasContent{
					Type: models.StepCanvasTypeCallout,
				},
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
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
			name:    "returns error for empty stepID",
			stepID:  "",
			req:     &types.UpdateStepRequest{},
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:    "returns error for invalid UUID",
			stepID:  "not-a-uuid",
			req:     &types.UpdateStepRequest{},
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockPresignService) {},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			stepID: uuid.New().String(),
			req: &types.UpdateStepRequest{
				Action: new(models.StepActionClick),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
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
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockPresignService) {
				mockStepsRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateStepDTO")).
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
			mockPresignClient := new(tests.MockPresignService)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			tt.setup(mockStepsRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, nil, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

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
			mockPresignClient.AssertExpectations(t)
		})
	}
}

func TestStepsService_Delete(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		stepID  string
		setup   func(*tests.MockStepsRepository, *tests.MockMediaAssetsRepository)
		wantErr bool
	}{
		{
			name:   "deletes step with assets",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				storagePath := "uploads/test/asset.png"
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{
						{ID: uuid.New(), StepID: uuid.New(), StoragePath: storagePath},
					}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:   "deletes step without assets",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty stepID",
			stepID:  "",
			setup:   func(_ *tests.MockStepsRepository, _ *tests.MockMediaAssetsRepository) {},
			wantErr: true,
		},
		{
			name:   "returns error when GetByStepID fails",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "returns error when repo delete fails",
			stepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.MediaAsset{}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, mock.AnythingOfType("string")).
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
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			tt.setup(mockStepsRepo, mockMediaAssetsRepo)
			mockPresignClient := new(tests.MockPresignService)
			mockStorageService := new(tests.MockStorageService)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, nil, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

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
			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}

func TestStepsService_Reorder(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name         string
		userID       string
		guideID      string
		targetStepID string
		prevStepID   *string
		nextStepID   *string
		setup        func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		wantErr      bool
		wantLen      int
	}{
		{
			name:         "reorders steps successfully",
			userID:       uuid.New().String(),
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			prevStepID:   new(uuid.New().String()),
			nextStepID:   new(uuid.New().String()),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "b0", Action: new(models.StepActionInput)},
					}, nil).
					Once()
			},
			wantLen: 2,
		},
		{
			name:         "reorders step to beginning",
			userID:       uuid.New().String(),
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			prevStepID:   nil,
			nextStepID:   new(uuid.New().String()),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{ID: uuid.New(), CreatorID: uuid.New().String(), Title: "Test Guide", Status: models.StatusDraft}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
					}, nil).
					Once()
			},
			wantLen: 1,
		},
		{
			name:         "reorders step to end",
			userID:       uuid.New().String(),
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			prevStepID:   new(uuid.New().String()),
			nextStepID:   nil,
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{ID: uuid.New(), CreatorID: uuid.New().String(), Title: "Test Guide", Status: models.StatusDraft}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
					}, nil).
					Once()
			},
			wantLen: 1,
		},
		{
			name:         "returns error for empty user ID",
			userID:       "",
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			setup:        func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr:      true,
		},
		{
			name:         "returns error for empty guide ID",
			userID:       uuid.New().String(),
			guideID:      "",
			targetStepID: uuid.New().String(),
			setup:        func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService) {},
			wantErr:      true,
		},
		{
			name:         "returns error when guide not found",
			userID:       uuid.New().String(),
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:         "propagates repository error",
			userID:       uuid.New().String(),
			guideID:      uuid.New().String(),
			targetStepID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("Reorder", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("*string"), mock.AnythingOfType("*string")).
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
			tt.setup(mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockStorageService := new(tests.MockStorageService)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

			steps, err := svc.Reorder(context.Background(), tt.userID, tt.guideID, tt.targetStepID, tt.prevStepID, tt.nextStepID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, steps)
				if tt.userID == "" {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
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
	userID := uuid.New().String()

	baseGuide := &models.Guide{
		ID:        guideID,
		CreatorID: userID,
		Title:     "Test Guide",
		Status:    models.StatusDraft,
	}

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
		userID  string
		stepID  string
		req     *types.DuplicateStepRequest
		setup   func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService, *tests.MockStorageService, *tests.MockMediaAssetsRepository)
		wantErr bool
	}{
		{
			name:   "success, no media assets",
			userID: userID,
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
					Return(newStep, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, newStepID.String()).
					Return(fetchedStep, nil).
					Once()
			},
		},
		{
			name:   "success with 2 media assets and S3 copies",
			userID: userID,
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
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[0], newPaths[0]).
					Return(nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[1], newPaths[1]).
					Return(nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
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
			userID: userID,
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
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
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
			userID: userID,
			stepID: stepID.String(),
			req: &types.DuplicateStepRequest{
				InsertBeforeStepID: new(uuid.New().String()),
			},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
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
			name:   "returns error for empty userID",
			userID: "",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error for whitespace userID",
			userID: "   ",
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error for empty stepID",
			userID: userID,
			stepID: "",
			req:    &types.DuplicateStepRequest{},
			setup: func(_ *tests.MockStepsRepository, _ *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
			},
			wantErr: true,
		},
		{
			name:   "returns error when step not found",
			userID: userID,
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
			name:   "returns error when guide not found",
			userID: userID,
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "returns error when guide is deleted",
			userID: userID,
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, _ *tests.MockStorageService, _ *tests.MockMediaAssetsRepository) {
				now := time.Now()
				deletedGuide := &models.Guide{
					ID:        guideID,
					CreatorID: userID,
					Title:     "Test Guide",
					Status:    models.StatusDraft,
					DeletedAt: &now,
				}
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(baseStep, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(deletedGuide, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "S3 copy failure mid-loop",
			userID: userID,
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
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
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[0], newPaths[0]).
					Return(nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePaths[1], newPaths[1]).
					Return(assert.AnError).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
					Return(&models.MediaAsset{}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:   "MediaAssetsRepo.Create failure",
			userID: userID,
			stepID: stepID.String(),
			req:    &types.DuplicateStepRequest{},
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService, mockStorageService *tests.MockStorageService, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
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
				mockGuidesRepo.On("GetByID", mock.Anything, userID, guideID.String()).
					Return(baseGuide, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateStepDTO")).
					Return(newStep, nil).
					Once()
				mockStorageService.On("CopyObject", mock.Anything, "test-bucket", storagePath, newPath).
					Return(nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
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
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, mockStorageService, mockMediaAssetsRepo, "test-bucket", logger)

			step, err := svc.Duplicate(context.Background(), tt.userID, tt.stepID, tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, step)
				if tt.userID == "" || tt.userID == "   " {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
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
