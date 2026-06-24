package guides

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/internal/models"
)

const (
	guidesCacheKeyPrefix = "guide:"
	guidesCacheTTL       = 1 * time.Hour
)

type redisGuidesCache struct {
	client *redis.Client
}

func NewRedisGuidesCache(client *redis.Client) *redisGuidesCache {
	return &redisGuidesCache{client: client}
}

func (c *redisGuidesCache) cacheKey(guideID string) string {
	return fmt.Sprintf("%s%s", guidesCacheKeyPrefix, guideID)
}

func (c *redisGuidesCache) Get(ctx context.Context, guideID string) (*models.Guide, error) {
	data, err := c.client.Get(ctx, c.cacheKey(guideID)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var guide models.Guide
	if err := json.Unmarshal(data, &guide); err != nil {
		return nil, err
	}

	return &guide, nil
}

func (c *redisGuidesCache) Set(ctx context.Context, guide *models.Guide) error {
	data, err := json.Marshal(guide)
	if err != nil {
		return err
	}

	return c.client.Set(ctx, c.cacheKey(guide.ID.String()), data, guidesCacheTTL).Err()
}

func (c *redisGuidesCache) Invalidate(ctx context.Context, guideID string) error {
	return c.client.Del(ctx, c.cacheKey(guideID)).Err()
}
