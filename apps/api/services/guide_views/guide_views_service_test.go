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

	cases := []struct {
		name      string
		guide     *models.Guide
		viewerID  *uuid.UUID
		ipHash    string
		userAgent string
		seed      func(*redis.Client) error
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
		},
		{
			name: "published without viewer ID",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
		},
		{
			name: "published with empty ip and user agent",
			guide: &models.Guide{
				ID: uuid.New(), TeamID: uuid.New(), Status: models.StatusPublished,
			},
		},
		{
			name: "duplicate view is deduped",
			guide: &models.Guide{
				ID: guideID, TeamID: teamID, Status: models.StatusPublished,
			},
			viewerID: &viewerID,
			seed: func(rdb *redis.Client) error {
				dedupKey := "dedupe:guide-views:{" + guideID.String() + "}:user:" + viewerID.String()
				return rdb.Set(context.Background(), dedupKey, "1", 0).Err()
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

			err := svc.RecordView(context.Background(), tt.guide.TeamID, tt.guide, tt.viewerID, tt.ipHash, tt.userAgent, "2026-07-30T20:00:00Z")

			if tt.wantErr {
				if tt.wantIsErr != nil {
					assert.ErrorIs(t, err, tt.wantIsErr)
				} else {
					assert.Error(t, err)
				}
			} else {
				assert.NoError(t, err)
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
			name: "no dedup keys",
		},
		{
			name: "flushes existing dedup keys",
			seed: func(rdb *redis.Client) error {
				viewerID := uuid.New()
				dedupKey := "dedupe:guide-views:{" + guideID.String() + "}:user:" + viewerID.String()
				return rdb.Set(context.Background(), dedupKey, "1", 0).Err()
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
