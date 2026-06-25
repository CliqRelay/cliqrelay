package guides

import (
	"context"
	"sync"

	"github.com/CliqRelay/cliqrelay/models"
)

type inMemoryGuidesCache struct {
	mu    sync.RWMutex
	cache map[string]*models.Guide
}

func NewInMemoryGuidesCache() *inMemoryGuidesCache {
	return &inMemoryGuidesCache{
		cache: make(map[string]*models.Guide),
	}
}

func (c *inMemoryGuidesCache) Get(_ context.Context, guideID string) (*models.Guide, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	guide, ok := c.cache[guideID]
	if !ok {
		return nil, nil
	}

	return guide, nil
}

func (c *inMemoryGuidesCache) Set(_ context.Context, guide *models.Guide) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache[guide.ID.String()] = guide
	return nil
}

func (c *inMemoryGuidesCache) Invalidate(_ context.Context, guideID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.cache, guideID)
	return nil
}
