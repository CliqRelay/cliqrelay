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

	authulamodels "github.com/Authula/authula/models"

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
		CreatorID: new(uuid.New().String()),
		Title:     "Draft Guide",
		Status:    models.StatusDraft,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository, *tests.MockStepsRepository)
		wantErr bool
	}{
		{
			name:    "publishes guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(draftGuide, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.Anything).
					Return([]*models.Step{}, nil).
					Once()
				mockRepo.On("UpdateDuration", mock.Anything, mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:          uuid.New(),
						CreatorID:   new(uuid.New().String()),
						Title:       "Guide",
						Status:      models.StatusPublished,
						PublishedAt: &future,
					}, nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup: func(mockRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository) {
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not draft",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
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
			setup: func(mockRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(draftGuide, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.Anything).
					Return([]*models.Step{}, nil).
					Once()
				mockRepo.On("UpdateDuration", mock.Anything, mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockRepo.On("Publish", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			tt.setup(mockRepo, mockStepsRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, mockStepsRepo, testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Publish(context.Background(), nil, tt.guideID)

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
		})
	}
}

func TestGuidesService_UnpublishGuide(t *testing.T) {

	publishedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: new(uuid.New().String()),
		Title:     "Published Guide",
		Status:    models.StatusPublished,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:    "unpublishes published guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Unpublish", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
						Title:     "Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is draft",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
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
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
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
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Unpublish", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Unpublish(context.Background(), nil, tt.guideID)

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
		})
	}
}

func TestGuidesService_ArchiveGuide(t *testing.T) {

	publishedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: new(uuid.New().String()),
		Title:     "Published Guide",
		Status:    models.StatusPublished,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:    "archives published guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  new(uuid.New().String()),
						Title:      "Guide",
						Status:     models.StatusArchived,
						ArchivedAt: &future,
					}, nil).
					Once()
			},
		},
		{
			name:    "archives draft guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				draftGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: new(uuid.New().String()),
					Title:     "Draft Guide",
					Status:    models.StatusDraft,
				}
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(draftGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  new(uuid.New().String()),
						Title:      "Guide",
						Status:     models.StatusArchived,
						ArchivedAt: &future,
					}, nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is archived",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
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
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(publishedGuide, nil).
					Once()
				mockRepo.On("Archive", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Archive(context.Background(), nil, tt.guideID)

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
		})
	}
}

func TestGuidesService_RestoreGuide(t *testing.T) {

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:    "restores guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				deletedGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: new("test-user-123"),
					Title:     "Deleted Guide",
					Status:    models.StatusDeleted,
				}
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  new(uuid.New().String()),
						Title:      "Guide",
						Status:     models.StatusDraft,
						RestoredAt: &future,
					}, nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not deleted",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				guide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: new("test-user-123"),
					Title:     "Active Guide",
					Status:    models.StatusDraft,
				}
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(guide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "propagates repository error",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				deletedGuide := &models.Guide{
					ID:        uuid.New(),
					CreatorID: new("test-user-123"),
					Title:     "Deleted Guide",
					Status:    models.StatusDeleted,
				}
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Restore(context.Background(), nil, tt.guideID)

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
		})
	}
}

func TestGuidesService_UnarchiveGuide(t *testing.T) {

	archivedGuide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: new(uuid.New().String()),
		Title:     "Archived Guide",
		Status:    models.StatusArchived,
	}

	cases := []struct {
		name    string
		guideID string
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:    "unarchives guide successfully",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				future := time.Now().Add(time.Hour).UTC()
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(archivedGuide, nil).
					Once()
				mockRepo.On("Unarchive", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:         uuid.New(),
						CreatorID:  new(uuid.New().String()),
						Title:      "Guide",
						Status:     models.StatusDraft,
						RestoredAt: &future,
					}, nil).
					Once()
			},
		},
		{
			name:    "returns error for empty guide ID",
			guideID: "",
			setup:   func(mockRepo *tests.MockGuidesRepository) {},
			wantErr: true,
		},
		{
			name:    "returns error when guide not found via GetByID",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, nil).
					Once()
			},
			wantErr: true,
		},
		{
			name:    "returns error when guide is not archived",
			guideID: uuid.New().String(),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
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
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(archivedGuide, nil).
					Once()
				mockRepo.On("Unarchive", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Unarchive(context.Background(), nil, tt.guideID)

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
		})
	}
}

func TestGuidesService_CreateGuide(t *testing.T) {

	cases := []struct {
		name    string
		req     *types.CreateGuideRequest
		actor   *authulamodels.Actor
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:  "creates guide successfully",
			actor: &authulamodels.Actor{ID: "test-user-123"},
			req: &types.CreateGuideRequest{
				Title:       "Test Guide",
				Description: new("A test description"),
			},
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: new(uuid.New().String()),
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
			},
		},
		{
			name:  "propagates repository error",
			actor: &authulamodels.Actor{ID: "test-user-123"},
			req: &types.CreateGuideRequest{
				Title: "Test",
			},
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			guide, err := svc.Create(context.Background(), tt.actor, "00000000-0000-0000-0000-000000000001", tt.req)

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, guide)
				if tt.actor.ID == "" || tt.actor.ID == "   " {
					assert.ErrorIs(t, err, constants.ErrInvalidUserID)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, tt.req.Title, guide.Title)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestGuidesService_GetAll(t *testing.T) {

	userID := uuid.New().String()
	guides := []*models.Guide{
		{ID: uuid.New(), CreatorID: &userID, Title: "Guide 1", Status: models.StatusDraft},
		{ID: uuid.New(), CreatorID: &userID, Title: "Guide 2", Status: models.StatusPublished},
	}

	cases := []struct {
		name    string
		status  *string
		setup   func(*tests.MockGuidesRepository)
		wantErr bool
	}{
		{
			name:   "returns all guides when status is nil",
			status: nil,
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return(guides, 2, nil).
					Once()
			},
		},
		{
			name:   "returns archived guides",
			status: new(models.StatusArchived.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return(guides, 1, nil).
					Once()
			},
		},
		{
			name:   "returns draft guides",
			status: new(models.StatusDraft.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return(guides, 1, nil).
					Once()
			},
		},
		{
			name:   "returns published guides",
			status: new(models.StatusPublished.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return(guides, 1, nil).
					Once()
			},
		},
		{
			name:    "returns error for invalid status",
			status:  new("some_invalid_status"),
			setup:   func(mockRepo *tests.MockGuidesRepository) {},
			wantErr: true,
		},
		{
			name:   "propagates repository error for archived status",
			status: new(models.StatusArchived.ToString()),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return(([]*models.Guide)(nil), 0, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			mockStarredRepo := new(tests.MockStarredGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, mockStarredRepo, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			result, total, err := svc.GetAll(context.Background(), "00000000-0000-0000-0000-000000000001", tt.status, nil, false, 1, 10, "", "")

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Zero(t, total)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Len(t, result, 2)
				assert.Greater(t, total, 0)
			}

			mockRepo.AssertExpectations(t)
		})
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			mockStarredRepo := new(tests.MockStarredGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, mockStarredRepo, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

			result, total, err := svc.GetAll(context.Background(), "00000000-0000-0000-0000-000000000001", tt.status, nil, false, 1, 10, "", "")

			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.Zero(t, total)
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				assert.Len(t, result, 2)
				assert.Greater(t, total, 0)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}

func TestGuidesService_GetOrgCount(t *testing.T) {
	orgID := uuid.New().String()
	parsedOrgID := uuid.MustParse(orgID)

	cases := []struct {
		name       string
		orgID      string
		viewer     *string
		setup      func(*tests.MockGuidesRepository)
		wantCount  int
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:   "returns count for organization",
			orgID:  orgID,
			viewer: nil,
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetCount", mock.Anything, mock.MatchedBy(func(filter *types.GuideFilter) bool {
					return filter.OrganizationID != nil && *filter.OrganizationID == parsedOrgID &&
						filter.ViewerUserID == nil && !filter.AccessibleOnly
				})).
					Return(5, nil).
					Once()
			},
			wantCount: 5,
		},
		{
			name:   "sets accessibility filter when viewer provided",
			orgID:  orgID,
			viewer: new("user-1"),
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetCount", mock.Anything, mock.MatchedBy(func(filter *types.GuideFilter) bool {
					return filter.OrganizationID != nil && *filter.OrganizationID == parsedOrgID &&
						filter.ViewerUserID != nil && *filter.ViewerUserID == "user-1" && filter.AccessibleOnly
				})).
					Return(3, nil).
					Once()
			},
			wantCount: 3,
		},
		{
			name:   "returns error for invalid organization ID",
			orgID:  "not-a-uuid",
			viewer: nil,
			setup: func(mockRepo *tests.MockGuidesRepository) {
			},
			wantErr:    true,
			wantErrMsg: constants.ErrOrganizationNotFound.Error(),
		},
		{
			name:   "propagates repository error",
			orgID:  orgID,
			viewer: nil,
			setup: func(mockRepo *tests.MockGuidesRepository) {
				mockRepo.On("GetCount", mock.Anything, mock.Anything).
					Return(0, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {

			mockRepo := new(tests.MockGuidesRepository)
			tt.setup(mockRepo)
			svc := guidesservice.NewGuidesService(mockRepo, nil, nil, testRedisClient(), (*interfaces.GuideHooks)(nil))

			count, err := svc.GetOrgCount(context.Background(), tt.orgID, tt.viewer)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.EqualError(t, err, tt.wantErrMsg)
				}
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.wantCount, count)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
