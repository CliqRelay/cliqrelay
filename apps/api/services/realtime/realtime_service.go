package realtime

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/types"
)

type RealtimeService struct {
	redisClient *redis.Client
	logger      *slog.Logger
}

func NewRealtimeService(redisClient *redis.Client, logger *slog.Logger) *RealtimeService {
	if logger == nil {
		logger = slog.Default()
	}
	return &RealtimeService{redisClient: redisClient, logger: logger}
}

func (s *RealtimeService) Publish(ctx context.Context, teamID uuid.UUID, eventType string, data any, userIDs ...string) error {
	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}
	message, err := json.Marshal(types.RealtimeEvent{Type: eventType, Data: payload, UserIDs: userIDs})
	if err != nil {
		return err
	}
	return s.redisClient.Publish(ctx, events.RealtimeTeamChannel(teamID.String()), message).Err()
}

func (s *RealtimeService) Subscribe(ctx context.Context, teamID uuid.UUID) (<-chan *types.RealtimeEvent, func() error, error) {
	pubsub := s.redisClient.Subscribe(ctx, events.RealtimeTeamChannel(teamID.String()))
	// Wait for the subscription to be confirmed so nothing published after this returns is missed.
	if _, err := pubsub.Receive(ctx); err != nil {
		_ = pubsub.Close()
		return nil, nil, err
	}

	feed := make(chan *types.RealtimeEvent)
	go func() {
		defer close(feed)
		for msg := range pubsub.Channel() {
			var event types.RealtimeEvent
			if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
				s.logger.Error("failed to decode realtime event", "err", err)
				continue
			}
			select {
			case feed <- &event:
			case <-ctx.Done():
				return
			}
		}
	}()

	return feed, pubsub.Close, nil
}
