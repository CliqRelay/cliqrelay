package guideviews_test

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/models"
	guideviewsservice "github.com/CliqRelay/cliqrelay/services/guide_views"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func testRedisClient(t *testing.T) *redis.Client {
	t.Helper()
	s, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(s.Close)
	return redis.NewClient(&redis.Options{Addr: s.Addr()})
}

func TestGuideViewsService_RecordView(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()
	teamID := uuid.New()
	viewerID := uuid.New()

	const viewedAt = "2026-07-30T20:00:00Z"

	expectCreate := func(mockRepo *tests.MockGuideViewsRepository) {
		mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil).Once()
	}

	cases := []struct {
		name      string
		guide     *models.Guide
		viewerID  *uuid.UUID
		ipHash    string
		userAgent string
		viewedAt  string
		setup     func(*tests.MockGuideViewsRepository)
		seed      func(*redis.Client) error
		check     func(*testing.T, *redis.Client, *tests.MockGuideViewsRepository)
		wantErr   bool
		wantIsErr error
	}{
		{
			name: "draft guide returns error",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusDraft,
			},
			wantErr:   true,
			wantIsErr: constants.ErrGuideNotPublished,
		},
		{
			name: "archived guide returns error",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusArchived,
			},
			wantErr:   true,
			wantIsErr: constants.ErrGuideNotPublished,
		},
		{
			name: "deleted guide returns error",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusDeleted,
			},
			wantErr:   true,
			wantIsErr: constants.ErrGuideNotPublished,
		},
		{
			name: "published with viewer ID",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			viewerID: &viewerID,
			setup:    expectCreate,
			check: func(t *testing.T, rdb *redis.Client, _ *tests.MockGuideViewsRepository) {
				exists, err := rdb.Exists(context.Background(), "dedupe:guide-views:{"+guideID.String()+"}:user:"+viewerID.String()).Result()
				require.NoError(t, err)
				assert.EqualValues(t, 1, exists)
			},
		},
		{
			name: "published without viewer ID",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			setup: expectCreate,
		},
		{
			name: "published with empty ip and user agent",
			guide: &models.Guide{
				ID: uuid.New(), TeamID: uuid.New(), Status: models.StatusPublished,
			},
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateGuideViewDTO) bool {
					return dto.IPHash == nil && dto.UserAgent == nil
				})).Return(nil).Once()
			},
		},
		{
			name: "snapshots the guide duration onto the view",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished, DurationSeconds: 143,
			},
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(dto *types.CreateGuideViewDTO) bool {
					return dto.DurationSeconds == 143 &&
						dto.GuideID == guideID &&
						dto.TeamID == teamID &&
						dto.ViewedAt.Equal(time.Date(2026, 7, 30, 20, 0, 0, 0, time.UTC))
				})).Return(nil).Once()
			},
		},
		{
			name: "duplicate view is deduped",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			viewerID: &viewerID,
			seed: func(rdb *redis.Client) error {
				dedupeKey := "dedupe:guide-views:{" + guideID.String() + "}:user:" + viewerID.String()
				return rdb.Set(context.Background(), dedupeKey, "1", 0).Err()
			},
		},
		{
			name: "invalid viewed at returns error",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			viewedAt: "not-a-timestamp",
			wantErr:  true,
		},
		{
			name: "propagates repository error and leaves the view undeduped",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			viewerID: &viewerID,
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("Create", mock.Anything, mock.Anything).Return(assert.AnError).Once()
			},
			wantErr: true,
			check: func(t *testing.T, rdb *redis.Client, _ *tests.MockGuideViewsRepository) {
				exists, err := rdb.Exists(context.Background(), "dedupe:guide-views:{"+guideID.String()+"}:user:"+viewerID.String()).Result()
				require.NoError(t, err)
				assert.EqualValues(t, 0, exists)
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockGuideViewsRepository)
			if tt.setup != nil {
				tt.setup(mockRepo)
			}
			rdb := testRedisClient(t)
			svc := guideviewsservice.NewGuideViewsService(mockRepo, rdb)

			if tt.seed != nil {
				require.NoError(t, tt.seed(rdb))
			}

			recordedAt := viewedAt
			if tt.viewedAt != "" {
				recordedAt = tt.viewedAt
			}

			err := svc.RecordView(context.Background(), tt.guide.TeamID, tt.guide, tt.viewerID, tt.ipHash, tt.userAgent, recordedAt)

			if tt.wantErr {
				if tt.wantIsErr != nil {
					assert.ErrorIs(t, err, tt.wantIsErr)
				} else {
					assert.Error(t, err)
				}
			} else {
				assert.NoError(t, err)
			}

			if tt.check != nil {
				tt.check(t, rdb, mockRepo)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestGuideViewsService_GetTimeSavedByTeam(t *testing.T) {
	t.Parallel()

	teamID := uuid.New()
	since := time.Now().Add(-24 * time.Hour)

	cases := []struct {
		name    string
		setup   func(*tests.MockGuideViewsRepository)
		want    int
		wantErr bool
	}{
		{
			name: "folds view counts against their snapshotted durations",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, teamID, mock.Anything).
					Return([]*types.GuideViewStats{
						// max(30*3, 120) - 30 = 90, twice
						{ViewCount: 2, DurationSeconds: 30},
						// max(600*3, 120) - 600 = 1200
						{ViewCount: 1, DurationSeconds: 600},
					}, nil).
					Once()
			},
			want: 1380,
		},
		{
			name: "ignores views whose snapshotted duration is zero",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, teamID, mock.Anything).
					Return([]*types.GuideViewStats{
						{ViewCount: 5, DurationSeconds: 0},
						{ViewCount: 1, DurationSeconds: 60},
					}, nil).
					Once()
			},
			want: 120,
		},
		{
			name: "no views saves no time",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, teamID, mock.Anything).
					Return([]*types.GuideViewStats{}, nil).
					Once()
			},
			want: 0,
		},
		{
			name: "propagates repository error",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, teamID, mock.Anything).
					Return([]*types.GuideViewStats(nil), assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockGuideViewsRepository)
			tt.setup(mockRepo)

			svc := guideviewsservice.NewGuideViewsService(mockRepo, testRedisClient(t))

			total, err := svc.GetTimeSavedByTeam(context.Background(), teamID, &since)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.want, total)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestGuideViewsService_GetCountByTeam(t *testing.T) {
	t.Parallel()

	teamID := uuid.New()
	since := time.Now().Add(-24 * time.Hour)

	cases := []struct {
		name      string
		setup     func(*tests.MockGuideViewsRepository)
		wantErr   bool
		wantCount int
	}{
		{
			name: "returns count successfully",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetCountByTeam", mock.Anything, teamID, mock.Anything).
					Return(42, nil).
					Once()
			},
			wantCount: 42,
		},
		{
			name: "propagates repository error",
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetCountByTeam", mock.Anything, teamID, mock.Anything).
					Return(0, assert.AnError).
					Once()
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockGuideViewsRepository)
			tt.setup(mockRepo)

			rdb := testRedisClient(t)
			svc := guideviewsservice.NewGuideViewsService(mockRepo, rdb)

			count, err := svc.GetCountByTeam(context.Background(), teamID, &since)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.wantCount, count)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestGuideViewsService_FlushGuideDedupeKeys(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()

	cases := []struct {
		name    string
		seed    func(*redis.Client) error
		wantErr bool
	}{
		{
			name: "no dedupe keys",
		},
		{
			name: "flushes existing dedupe keys",
			seed: func(rdb *redis.Client) error {
				viewerID := uuid.New()
				dedupeKey := "dedupe:guide-views:{" + guideID.String() + "}:user:" + viewerID.String()
				return rdb.Set(context.Background(), dedupeKey, "1", 0).Err()
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockGuideViewsRepository)
			rdb := testRedisClient(t)
			svc := guideviewsservice.NewGuideViewsService(mockRepo, rdb)

			if tt.seed != nil {
				require.NoError(t, tt.seed(rdb))
			}

			err := svc.FlushGuideDedupeKeys(context.Background(), guideID)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}
