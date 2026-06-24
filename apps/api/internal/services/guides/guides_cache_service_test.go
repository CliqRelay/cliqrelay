package guides_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/internal/models"
	guidesservice "github.com/CliqRelay/cliqrelay/internal/services/guides"
)

func TestInMemoryGuidesCache_Get_NotFound(t *testing.T) {
	t.Parallel()

	cache := guidesservice.NewInMemoryGuidesCache()

	result, err := cache.Get(context.Background(), uuid.New().String())

	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestInMemoryGuidesCache_SetAndGet(t *testing.T) {
	t.Parallel()

	cache := guidesservice.NewInMemoryGuidesCache()
	guide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: "user-123",
		Title:     "Test Guide",
		Status:    models.StatusDraft,
	}

	err := cache.Set(context.Background(), guide)
	require.NoError(t, err)

	result, err := cache.Get(context.Background(), guide.ID.String())
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, guide.ID, result.ID)
	assert.Equal(t, "Test Guide", result.Title)
}

func TestInMemoryGuidesCache_Invalidate(t *testing.T) {
	t.Parallel()

	cache := guidesservice.NewInMemoryGuidesCache()
	guide := &models.Guide{
		ID:        uuid.New(),
		CreatorID: "user-123",
		Title:     "Test Guide",
		Status:    models.StatusDraft,
	}

	err := cache.Set(context.Background(), guide)
	require.NoError(t, err)

	err = cache.Invalidate(context.Background(), guide.ID.String())
	require.NoError(t, err)

	result, err := cache.Get(context.Background(), guide.ID.String())
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestInMemoryGuidesCache_Invalidate_NonExistent(t *testing.T) {
	t.Parallel()

	cache := guidesservice.NewInMemoryGuidesCache()

	err := cache.Invalidate(context.Background(), uuid.New().String())

	require.NoError(t, err)
}

func TestInMemoryGuidesCache_Overwrite(t *testing.T) {
	t.Parallel()

	cache := guidesservice.NewInMemoryGuidesCache()
	guideID := uuid.New()

	guide1 := &models.Guide{
		ID:    guideID,
		Title: "Original Title",
	}
	guide2 := &models.Guide{
		ID:    guideID,
		Title: "Updated Title",
	}

	err := cache.Set(context.Background(), guide1)
	require.NoError(t, err)

	err = cache.Set(context.Background(), guide2)
	require.NoError(t, err)

	result, err := cache.Get(context.Background(), guideID.String())
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "Updated Title", result.Title)
}
