package purge_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/models"
	guideviews "github.com/CliqRelay/cliqrelay/services/guide_views"
	"github.com/CliqRelay/cliqrelay/services/purge"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestPurgeService_PurgeGuide(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()

	eligible := func(repo *tests.MockGuidesRepository, storage *tests.MockStorageService) {
		repo.On("GetPendingPurge", mock.Anything).Return([]uuid.UUID{guideID}, nil).Once()
		storage.On("DeleteObjectsByPrefix", mock.Anything, "bucket", mock.Anything).Return(nil).Once()
	}

	cases := []struct {
		name    string
		setup   func(*tests.MockGuidesRepository, *tests.MockStorageService, *tests.MockActivityLogsService)
		wantErr error
	}{
		{
			name: "removes the guide's activity, then the guide",
			setup: func(repo *tests.MockGuidesRepository, storage *tests.MockStorageService, activity *tests.MockActivityLogsService) {
				eligible(repo, storage)
				activity.On("DeleteByTarget", mock.Anything, models.ActivityTargetGuide, guideID.String()).Return(nil).Once()
				repo.On("HardDelete", mock.Anything, guideID.String()).Return(nil).Once()
			},
		},
		{
			name: "skips a guide that is no longer eligible",
			setup: func(repo *tests.MockGuidesRepository, _ *tests.MockStorageService, _ *tests.MockActivityLogsService) {
				repo.On("GetPendingPurge", mock.Anything).Return([]uuid.UUID{}, nil).Once()
			},
		},
		{
			name: "keeps the guide for a retry when its activity cannot be removed",
			setup: func(repo *tests.MockGuidesRepository, storage *tests.MockStorageService, activity *tests.MockActivityLogsService) {
				eligible(repo, storage)
				activity.On("DeleteByTarget", mock.Anything, models.ActivityTargetGuide, guideID.String()).Return(assert.AnError).Once()
			},
			wantErr: assert.AnError,
		},
		{
			name: "returns a hard delete failure for a retry",
			setup: func(repo *tests.MockGuidesRepository, storage *tests.MockStorageService, activity *tests.MockActivityLogsService) {
				eligible(repo, storage)
				activity.On("DeleteByTarget", mock.Anything, models.ActivityTargetGuide, guideID.String()).Return(nil).Once()
				repo.On("HardDelete", mock.Anything, guideID.String()).Return(assert.AnError).Once()
			},
			wantErr: assert.AnError,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := new(tests.MockGuidesRepository)
			storage := new(tests.MockStorageService)
			activity := new(tests.MockActivityLogsService)
			tt.setup(repo, storage, activity)
			guideViews := guideviews.NewGuideViewsService(new(tests.MockGuideViewsRepository), tests.NewTestRedisClient(t))
			svc := purge.NewPurgeService(repo, storage, guideViews, activity, "bucket")

			err := svc.PurgeGuide(context.Background(), guideID.String())

			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				require.NoError(t, err)
			}
			repo.AssertExpectations(t)
			storage.AssertExpectations(t)
			activity.AssertExpectations(t)
		})
	}
}
