package tests

import (
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// NewTestRedis returns a client connected to an in-memory Redis so tests can inspect published streams.
func NewTestRedis(t *testing.T) (*redis.Client, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	return client, mr
}

// NewUnreachableRedis returns a client whose every command fails, for "publish failed" cases.
func NewUnreachableRedis(t *testing.T) *redis.Client {
	t.Helper()
	client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1", MaxRetries: -1})
	t.Cleanup(func() { _ = client.Close() })
	return client
}

// NewTestRedisClient is NewTestRedis for callers that do not need to inspect the stream.
func NewTestRedisClient(t *testing.T) *redis.Client {
	t.Helper()
	client, _ := NewTestRedis(t)
	return client
}
