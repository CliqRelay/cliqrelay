package guides_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

var testRedisClient = sync.OnceValue(func() *redis.Client {
	return redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
})

func TestGuidesService_PublishGuide(t *testing.T) {


	draftGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: uuid.New().String(),
		Title:     "Draft Guide",
		Status:    models.StatusDraft,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService, *tests.MockStepsRepository)
		wantErr bool
	}{
		{
			name:    "publishes guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService, mockStepsRepo *tests.MockStepsRepository) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(draftGuide, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{}, nil).
					Once()
				mockRepo.On("UpdateDuration", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("int")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:          uuid.New(),
						CreatorID:   uuid.New().String(),
						Title:       "Guide",
						Status:      models.StatusPublished,
						PublishedAt: &future,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService, mockStepsRepo *tests.MockStepsRepository) {
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not draft",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Published Guide",
						Status:    models.StatusPublished,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(draftGuide, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{}, nil).
					Once()
				mockRepo.On("UpdateDuration", mock.Anything, mock.AnythingOfType("string"), mock.AnythingOfType("int")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache, mockStepsRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, mockStepsRepo, testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			guide, err := svc.Publish(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, models.StatusPublished, guide.Status)
				assert.NotNil(t, guide.PublishedAt)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_UnpublishGuide(t *testing.T) {


	publishedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: uuid.New().String(),
		Title:     "Published Guide",
		Status:    models.StatusPublished,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService)
		wantErr bool
	}{
		{
			name:    "unpublishes published guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Unpublish", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is draft",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Draft Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is archived",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Archived Guide",
						Status:    models.StatusArchived,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Unpublish", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			guide, err := svc.Unpublish(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, models.StatusDraft, guide.Status)
				assert.Nil(t, guide.PublishedAt)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_ArchiveGuide(t *testing.T) {


	publishedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: uuid.New().String(),
		Title:     "Published Guide",
		Status:    models.StatusPublished,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService)
		wantErr bool
	}{
		{
			name:    "archives published guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  uuid.New().String(),
						Title:      "Guide",
						Status:     models.StatusArchived,
						ArchivedAt: &future,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "archives draft guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				draftGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: uuid.New().String(),
					Title:     "Draft Guide",
					Status:    models.StatusDraft,
				}
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(draftGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  uuid.New().String(),
						Title:      "Guide",
						Status:     models.StatusArchived,
						ArchivedAt: &future,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is archived",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Archived Guide",
						Status:    models.StatusArchived,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			guide, err := svc.Archive(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, models.StatusArchived, guide.Status)
				assert.NotNil(t, guide.ArchivedAt)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_RestoreGuide(t *testing.T) {


	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService)
		wantErr bool
	}{
		{
			name:    "restores guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				deletedGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: "test-user-123",
					Title:     "Deleted Guide",
					Status:    models.StatusDeleted,
				}
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  uuid.New().String(),
						Title:      "Guide",
						Status:     models.StatusDraft,
						RestoredAt: &future,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not deleted",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				guide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: "test-user-123",
					Title:     "Active Guide",
					Status:    models.StatusDraft,
				}
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(guide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				deletedGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: "test-user-123",
					Title:     "Deleted Guide",
					Status:    models.StatusDeleted,
				}
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			guide, err := svc.Restore(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, models.StatusDraft, guide.Status)
				assert.NotNil(t, guide.RestoredAt)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_UnarchiveGuide(t *testing.T) {


	archivedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: uuid.New().String(),
		Title:     "Archived Guide",
		Status:    models.StatusArchived,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService)
		wantErr bool
	}{
		{
			name:    "unarchives guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(archivedGuide, nil).
					Once()
				mockRepo.On("Unarchive", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  uuid.New().String(),
						Title:      "Guide",
						Status:     models.StatusDraft,
						RestoredAt: &future,
					}, nil).
					Once()
				mockCache.On("Invalidate", mock.Anything, mock.AnythingOfType("string")).
					Return(nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not archived",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Draft Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(archivedGuide, nil).
					Once()
				mockRepo.On("Unarchive", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			guide, err := svc.Unarchive(context.Background(), tt.guideID)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, models.StatusDraft, guide.Status)
				assert.NotNil(t, guide.RestoredAt)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_CreateGuide(t *testing.T) {


	cases := []struct {
		name    string
		req     *types.CreateGuideRequest
		userID  string
		setup   func(*tests.MockGuidesRepository, *tests.MockGuidesCacheService)
		wantErr bool
	}{
		{
			name:   "creates guide successfully",
			userID: "test-user-123",
			req: &types.CreateGuideRequest{
				Title: "Test Guide",
				Description: new("A test description"),
			},
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateGuideDTO")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: uuid.New().String(),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
		},
		{
			name:   "returns error for empty user ID",
			userID: "",
			req: &types.CreateGuideRequest{
				Title: "Test",
			},
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:   "returns error for whitespace-only user ID",
			userID: "   ",
			req: &types.CreateGuideRequest{
				Title: "Test",
			},
			setup:   func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {},
			wantErr: true,
		},
		{
			name:   "propagates repository error",
			userID: "test-user-123",
			req: &types.CreateGuideRequest{
				Title: "Test",
			},
			setup: func(mockRepo *tests.MockGuidesRepository, mockCache *tests.MockGuidesCacheService) {
				mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateGuideDTO")).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			// Arrange
			mockRepo := new(tests.MockGuidesRepository)
			mockCache := new(tests.MockGuidesCacheService)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			if tt.userID == "" {
				mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "", Kind: models.IdentityTypeUser})
			} else if tt.userID == "   " {
				mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "   ", Kind: models.IdentityTypeUser})
			} else {
				mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			}
			mockAuthz.On("CanCreateGuide", mock.Anything, mock.Anything).Return(nil)
			tt.setup(mockRepo, mockCache)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			// Act
			guide, err := svc.Create(context.Background(), tt.req)

			// Assert
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
				if tt.userID == "" || tt.userID == "   " {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, tt.req.Title, guide.Title)
			}

			mockRepo.AssertExpectations(t)
			mockCache.AssertExpectations(t)
		})
	}
}

func TestGuidesService_GetByID_CacheHit(t *testing.T) {


	guideID := uuid.New()
	guide := &models.Guide{
		ID:        guideID,
		CreatorID: "user-123",
		Title:     "Cached Guide",
		Status:    models.StatusDraft,
	}

	mockRepo := new(tests.MockGuidesRepository)
	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockCache.On("Get", mock.Anything, guideID.String()).
		Return(guide, nil).
		Once()

	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.GetByID(context.Background(), guideID.String())

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, guideID, result.ID)
	assert.Equal(t, "Cached Guide", result.Title)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_GetByID_CacheMiss(t *testing.T) {


	guideID := uuid.New()
	guide := &models.Guide{
		ID:        guideID,
		CreatorID: "user-123",
		Title:     "DB Guide",
		Status:    models.StatusDraft,
	}

	mockRepo := new(tests.MockGuidesRepository)
	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockCache.On("Get", mock.Anything, guideID.String()).
		Return(nil, nil).
		Once()
	mockRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(guide, nil).
		Once()
	mockCache.On("Set", mock.Anything, guide).
		Return(nil).
		Once()

	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.GetByID(context.Background(), guideID.String())

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, guideID, result.ID)
	assert.Equal(t, "DB Guide", result.Title)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_GetByID_CacheWrongOwner(t *testing.T) {


	guideID := uuid.New()
	guide := &models.Guide{
		ID:        guideID,
		CreatorID: "other-user",
		Title:     "Cached Guide",
		Status:    models.StatusDraft,
	}

	mockRepo := new(tests.MockGuidesRepository)
	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockCache.On("Get", mock.Anything, guideID.String()).
		Return(guide, nil).
		Once()
	mockRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(guide, nil).
		Once()
	mockCache.On("Set", mock.Anything, guide).
		Return(nil).
		Once()

	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.GetByID(context.Background(), guideID.String())

	require.NoError(t, err)
	require.NotNil(t, result)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_GetByID_NoCache(t *testing.T) {


	guideID := uuid.New()
	guide := &models.Guide{
		ID:        guideID,
		CreatorID: "user-123",
		Title:     "DB Guide",
		Status:    models.StatusDraft,
	}

	mockRepo := new(tests.MockGuidesRepository)
	mockRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(guide, nil).
		Once()

	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockCache.On("Get", mock.Anything, guideID.String()).
		Return(nil, nil).
		Once()
	mockCache.On("Set", mock.Anything, guide).
		Return(nil).
		Once()

	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.GetByID(context.Background(), guideID.String())

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "DB Guide", result.Title)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_Update_InvalidatesCache(t *testing.T) {


	guideID := uuid.New()

	mockRepo := new(tests.MockGuidesRepository)
	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(&models.Guide{
			ID:        guideID,
			CreatorID: "test-user-123",
			Title:     "Original Guide",
			Status:    models.StatusDraft,
		}, nil).
		Once()
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*types.UpdateGuideDTO")).
		Return(&models.Guide{
			ID:        guideID,
			CreatorID: "test-user-123",
			Title:     "Updated Guide",
			Status:    models.StatusDraft,
		}, nil).
		Once()
	mockCache.On("Invalidate", mock.Anything, guideID.String()).
		Return(nil).
		Once()

	title := "Updated Guide"
	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.Update(context.Background(), guideID.String(), &types.UpdateGuideRequest{
		Title: &title,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "Updated Guide", result.Title)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_Delete_InvalidatesCache(t *testing.T) {


	guideID := uuid.New()

	mockRepo := new(tests.MockGuidesRepository)
	mockCache := new(tests.MockGuidesCacheService)
	mockIdentity := new(tests.MockIdentityService)
	mockAuthz := new(tests.MockAuthorizationService)

	mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
	mockAuthz.On("CanDeleteGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	mockRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(&models.Guide{
			ID:        guideID,
			CreatorID: "test-user-123",
			Title:     "Test Guide",
			Status:    models.StatusDraft,
		}, nil).
		Once()
	mockRepo.On("Delete", mock.Anything, guideID.String()).
		Return(&models.Guide{
			ID:        guideID,
			CreatorID: "test-user-123",
			Title:     "Deleted Guide",
			Status:    models.StatusDeleted,
		}, nil).
		Once()
	mockCache.On("Invalidate", mock.Anything, guideID.String()).
		Return(nil).
		Once()

	svc := guidesservice.NewGuidesService(mockRepo, nil, mockCache, new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

	result, err := svc.Delete(context.Background(), guideID.String())

	require.NoError(t, err)
	require.NotNil(t, result)

	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestGuidesService_GetAll(t *testing.T) {


	userID := uuid.New().String()
	guides := []*types.GuideWithStarred{
		{Guide: models.Guide{ID: uuid.New(), CreatorID: userID, Title: "Guide 1", Status: models.StatusDraft}, IsStarred: false},
		{Guide: models.Guide{ID: uuid.New(), CreatorID: userID, Title: "Guide 2", Status: models.StatusPublished}, IsStarred: false},
	}

	cases := []struct {
		name    string
		status  *string
		setup   func(*tests.MockGuidesRepository, *tests.MockStarredGuidesRepository)
		wantErr bool
	}{
		{
			name:   "returns all guides when status is nil",
			status: nil,
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return(guides, nil).
					Once()
			},
		},
		{
			name:   "returns archived guides",
			status: new(models.StatusArchived.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return(guides, nil).
					Once()
			},
		},
		{
			name:   "returns draft guides",
			status: new(models.StatusDraft.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return(guides, nil).
					Once()
			},
		},
		{
			name:   "returns published guides",
			status: new(models.StatusPublished.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return(guides, nil).
					Once()
			},
		},
		{
			name:   "returns deleted guides",
			status: new(models.StatusDeleted.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return(guides, nil).
					Once()
			},
		},
		{
			name:    "returns error for invalid status",
			status:  new("some_invalid_status"),
			setup:   func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {},
			wantErr: true,
		},
		{
			name:   "propagates repository error for archived status",
			status: new(models.StatusArchived.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStarredRepo *tests.MockStarredGuidesRepository) {
				mockStarredRepo.On("GetAll", mock.Anything, mock.AnythingOfType("*types.GuideFilter")).
					Return([]*types.GuideWithStarred{}, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
		

			mockRepo := new(tests.MockGuidesRepository)
			mockStarredRepo := new(tests.MockStarredGuidesRepository)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("GuideListFilter", mock.Anything, mock.Anything).Return(&types.GuideFilter{}, nil)
			tt.setup(mockRepo, mockStarredRepo)
			svc := guidesservice.NewGuidesService(mockRepo, mockStarredRepo, new(tests.MockGuidesCacheService), new(tests.MockStepsRepository), testRedisClient(), mockIdentity, mockAuthz, (*interfaces.GuideHooks)(nil))

			result, err := svc.GetAll(context.Background(), tt.status)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Len(t, result, 2)
			}

			mockRepo.AssertExpectations(t)
			mockStarredRepo.AssertExpectations(t)
		})
	}
}
