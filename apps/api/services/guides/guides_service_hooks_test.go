package guides_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

const hookTestTeamID = "00000000-0000-0000-0000-000000000001"

func TestGuidesService_Create_Hooks(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name                string
		setup               func(*tests.MockGuidesRepository, *interfaces.GuideHooks, *[]int)
		wantErr             bool
		wantOrder           []int
		wantCreateNotCalled bool
	}{
		{
			name: "runs multiple after create hooks in registration order",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide"}, nil).
					Once()
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 1)
					return nil
				})
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{1, 2},
		},
		{
			name: "returns before create hook error without creating the guide",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *authulamodels.Actor, _ string, _ *types.CreateGuideRequest) error {
					return assert.AnError
				})
			},
			wantErr:             true,
			wantCreateNotCalled: true,
		},
		{
			name: "returns after create hook error",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide"}, nil).
					Once()
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					return assert.AnError
				})
			},
			wantErr: true,
		},
		{
			name: "runs before create hook after organization lock and before create",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("LockOrganizationForUpdate", mock.Anything, mock.Anything).
					Return(nil).
					Once()
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide"}, nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *authulamodels.Actor, _ string, _ *types.CreateGuideRequest) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{2},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			var calls []int
			mockRepo := new(tests.MockGuidesRepository)
			hooks := &interfaces.GuideHooks{}
			tt.setup(mockRepo, hooks, &calls)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), hooks)

			// Act
			guide, err := svc.Create(context.Background(), &authulamodels.Actor{ID: "user-1"}, hookTestTeamID, &types.CreateGuideRequest{Title: "Test Guide"})

			// Assert
			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, tt.wantOrder, calls)
				assertLockedBeforeCreate(t, mockRepo)
			}
			if tt.wantCreateNotCalled {
				mockRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func assertLockedBeforeCreate(t *testing.T, mockRepo *tests.MockGuidesRepository) {
	t.Helper()
	lockIdx := -1
	createIdx := -1
	for i, call := range mockRepo.Calls {
		switch call.Method {
		case "LockOrganizationForUpdate":
			lockIdx = i
		case "Create":
			createIdx = i
		}
	}
	if lockIdx >= 0 && createIdx >= 0 {
		assert.Less(t, lockIdx, createIdx, "organization lock must be acquired before guide create")
	}
}

func TestGuidesService_Restore_Hooks(t *testing.T) {
	t.Parallel()

	deletedGuide := &models.Guide{
		ID:     uuid.New(),
		TeamID: uuid.MustParse(hookTestTeamID),
		Title:  "Deleted Guide",
		Status: models.StatusDeleted,
	}

	cases := []struct {
		name                 string
		setup                func(*tests.MockGuidesRepository, *interfaces.GuideHooks, *[]int)
		wantOrder            []int
		wantErr              bool
		wantRestoreNotCalled bool
	}{
		{
			name: "runs before and after restore hooks in registration order",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Restored Guide", Status: models.StatusDraft}, nil).
					Once()
				hooks.RegisterBeforeRestore(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 1)
					return nil
				})
				hooks.RegisterAfterRestore(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{1, 2},
		},
		{
			name: "returns before restore hook error without restoring the guide",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				hooks.RegisterBeforeRestore(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					return assert.AnError
				})
			},
			wantErr:              true,
			wantRestoreNotCalled: true,
		},
		{
			name: "returns after restore hook error",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Restored Guide", Status: models.StatusDraft}, nil).
					Once()
				hooks.RegisterAfterRestore(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					return assert.AnError
				})
			},
			wantErr: true,
		},
		{
			name: "runs before restore hook after guide is loaded and before restore",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(deletedGuide, nil).
					Once()
				mockRepo.On("Restore", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Restored Guide", Status: models.StatusDraft}, nil).
					Once()
				hooks.RegisterBeforeRestore(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{2},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var calls []int
			mockRepo := new(tests.MockGuidesRepository)
			hooks := &interfaces.GuideHooks{}
			tt.setup(mockRepo, hooks, &calls)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), hooks)

			guide, err := svc.Restore(context.Background(), &authulamodels.Actor{ID: "user-1"}, deletedGuide.ID.String())

			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, tt.wantOrder, calls)
				assertBeforeRestoreBeforeRepoRestore(t, mockRepo)
			}
			if tt.wantRestoreNotCalled {
				mockRepo.AssertNotCalled(t, "Restore", mock.Anything, mock.Anything)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func assertBeforeRestoreBeforeRepoRestore(t *testing.T, mockRepo *tests.MockGuidesRepository) {
	t.Helper()
	hookIdx := -1
	restoreIdx := -1
	for i, call := range mockRepo.Calls {
		switch call.Method {
		case "GetByID":
			hookIdx = i
		case "Restore":
			restoreIdx = i
		}
	}
	if hookIdx >= 0 && restoreIdx >= 0 {
		assert.Less(t, hookIdx, restoreIdx, "guide must be loaded before restore")
	}
}

func TestGuidesService_BulkRestore_Hooks(t *testing.T) {
	t.Parallel()

	guideIDs := []string{uuid.New().String(), uuid.New().String()}

	cases := []struct {
		name                     string
		setup                    func(*tests.MockGuidesRepository, *interfaces.GuideHooks, *[]int)
		wantOrder                []int
		wantErr                  bool
		wantBulkRestoreNotCalled bool
	}{
		{
			name: "runs before and after bulk restore hooks in registration order",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("BulkRestore", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
					Return(int64(2), nil).
					Once()
				hooks.RegisterBeforeBulkRestore(func(_ context.Context, _ *authulamodels.Actor, _ string, _ []string) error {
					*calls = append(*calls, 1)
					return nil
				})
				hooks.RegisterAfterBulkRestore(func(_ context.Context, _ *authulamodels.Actor, _ string, _ []string) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{1, 2},
		},
		{
			name: "returns before bulk restore hook error without restoring the guides",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				hooks.RegisterBeforeBulkRestore(func(_ context.Context, _ *authulamodels.Actor, _ string, _ []string) error {
					return assert.AnError
				})
			},
			wantErr:                  true,
			wantBulkRestoreNotCalled: true,
		},
		{
			name: "returns after bulk restore hook error",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("BulkRestore", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything).
					Return(int64(2), nil).
					Once()
				hooks.RegisterAfterBulkRestore(func(_ context.Context, _ *authulamodels.Actor, _ string, _ []string) error {
					return assert.AnError
				})
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			var calls []int
			mockRepo := new(tests.MockGuidesRepository)
			hooks := &interfaces.GuideHooks{}
			tt.setup(mockRepo, hooks, &calls)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), hooks)

			count, err := svc.BulkRestore(context.Background(), guideIDs, hookTestTeamID, &authulamodels.Actor{ID: "user-1"}, false)

			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Zero(t, count)
			} else {
				require.NoError(t, err)
				assert.Equal(t, int64(2), count)
				assert.Equal(t, tt.wantOrder, calls)
			}
			if tt.wantBulkRestoreNotCalled {
				mockRepo.AssertNotCalled(t, "BulkRestore", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}
