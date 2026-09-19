package media_assets_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
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

	t.Run("publishes media-asset.deleted for the removed row", func(t *testing.T) {
		t.Parallel()
		mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
		mockMediaAssetsRepo.On("GetByID", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
		mockMediaAssetsRepo.On("Delete", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
		redisClient, mr := tests.NewTestRedis(t)
		svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, new(tests.MockStepsRepository), new(tests.MockGuidesRepository), redisClient, nil, (*interfaces.MediaAssetHooks)(nil))

		_, err := svc.Delete(context.Background(), asset.ID.String())

		require.NoError(t, err)
		entries, err := redisClient.XRange(context.Background(), events.TopicMediaAssets, "-", "+").Result()
		require.NoError(t, err)
		require.Len(t, entries, 1)
		assert.Equal(t, events.EventTypeMediaAssetDeleted, entries[0].Values["event_type"])
		assert.Contains(t, entries[0].Values["payload"], asset.StoragePath)
		assert.True(t, mr.Exists(events.TopicMediaAssets))
		mockMediaAssetsRepo.AssertExpectations(t)
	})

	t.Run("publish failure does not fail the delete", func(t *testing.T) {
		t.Parallel()
		mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
		mockMediaAssetsRepo.On("GetByID", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
		mockMediaAssetsRepo.On("Delete", mock.Anything, asset.ID.String()).Return(asset, nil).Once()
		svc := mediaassetsservice.NewMediaAssetsService(mockMediaAssetsRepo, new(tests.MockStepsRepository), new(tests.MockGuidesRepository), tests.NewUnreachableRedis(t), nil, (*interfaces.MediaAssetHooks)(nil))

		deleted, err := svc.Delete(context.Background(), asset.ID.String())

		require.NoError(t, err)
		assert.Equal(t, asset.ID, deleted.ID)
		mockMediaAssetsRepo.AssertExpectations(t)
	})
}
