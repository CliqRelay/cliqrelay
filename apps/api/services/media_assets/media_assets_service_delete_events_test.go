package media_assets_test

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	mediaassetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/tests"
)

func TestMediaAssetsService_Delete_PublishesEvent(t *testing.T) {
	t.Parallel()

	asset := &models.MediaAsset{ID: uuid.New(), StepID: uuid.New(), StoragePath: "uploads/old.webp"}

	type expectedEvent struct {
		eventType string
		payload   events.MediaAssetDeletePayload
	}

	cases := []struct {
		name          string
		mediaAssetID  string
		setup         func(*tests.MockMediaAssetsRepository)
		newRedis      func(*testing.T) (*redis.Client, *miniredis.Miniredis)
		wantDeletedID uuid.UUID
		wantEvents    []expectedEvent
		wantStreams   []string
	}{
		{
			name:         "publishes media-asset.deleted for the removed row",
			mediaAssetID: asset.ID.String(),
			setup: func(repo *tests.MockMediaAssetsRepository) {
				repo.On("GetByID", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
				repo.On("Delete", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
			},
			newRedis: tests.NewTestRedis,
			wantEvents: []expectedEvent{
				{
					eventType: events.EventTypeMediaAssetDeleted,
					payload: events.MediaAssetDeletePayload{
						StepID:      asset.StepID.String(),
						StoragePath: asset.StoragePath,
					},
				},
			},
			wantStreams: []string{events.TopicMediaAssets},
		},
		{
			name:         "publish failure does not fail the delete",
			mediaAssetID: asset.ID.String(),
			setup: func(repo *tests.MockMediaAssetsRepository) {
				repo.On("GetByID", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
				repo.On("Delete", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
			},
			newRedis: func(t *testing.T) (*redis.Client, *miniredis.Miniredis) {
				return tests.NewUnreachableRedis(t), nil
			},
			wantDeletedID: asset.ID,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			tt.setup(mockMediaAssetsRepo)

			redisClient, mr := tt.newRedis(t)
			svc := mediaassetsservice.NewMediaAssetsService(
				mockMediaAssetsRepo,
				new(tests.MockStepsRepository),
				new(tests.MockGuidesRepository),
				redisClient,
				nil,
				(*interfaces.MediaAssetHooks)(nil),
			)

			deleted, err := svc.Delete(context.Background(), tt.mediaAssetID)

			require.NoError(t, err)

			if tt.wantDeletedID != uuid.Nil {
				require.NotNil(t, deleted)
				assert.Equal(t, tt.wantDeletedID, deleted.ID)
			}

			if len(tt.wantEvents) > 0 {
				entries, err := redisClient.XRange(context.Background(), events.TopicMediaAssets, "-", "+").Result()
				require.NoError(t, err)
				require.Len(t, entries, len(tt.wantEvents))

				for i, want := range tt.wantEvents {
					assert.Equal(t, want.eventType, entries[i].Values["event_type"])

					raw, ok := entries[i].Values["payload"].(string)
					require.True(t, ok)
					event, err := events.ReadEvent([]byte(raw))
					require.NoError(t, err)
					var got events.MediaAssetDeletePayload
					require.NoError(t, event.UnmarshalPayload(&got))
					assert.Equal(t, want.payload, got)
				}
			}

			for _, stream := range tt.wantStreams {
				require.NotNil(t, mr)
				assert.True(t, mr.Exists(stream))
			}

			mockMediaAssetsRepo.AssertExpectations(t)
		})
	}
}
