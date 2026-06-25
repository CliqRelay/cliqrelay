package worker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type StreamHandler func(ctx context.Context, msgID string, payload []byte) error

type NackMode string

const (
	NackModeSilent NackMode = "SILENT"
	NackModeFail   NackMode = "FAIL"
	NackModeFatal  NackMode = "FATAL"
)

type HandlerError struct {
	Err  error
	Mode NackMode
}

func (e *HandlerError) Error() string {
	return e.Err.Error()
}

func (e *HandlerError) Unwrap() error {
	return e.Err
}

type StreamConsumer struct {
	client        *redis.Client
	consumerGroup string
	handlers      map[string]map[string]StreamHandler
	wg            sync.WaitGroup
	cancel        context.CancelFunc
	maxRetries    int
	concurrency   int
	inflight      sync.Map
}

type StreamConsumerOption func(*StreamConsumer)

func WithConcurrency(n int) StreamConsumerOption {
	return func(c *StreamConsumer) {
		if n < 1 {
			n = 1
		}
		c.concurrency = n
	}
}

func NewStreamConsumer(client *redis.Client, consumerGroup string, maxRetries int, opts ...StreamConsumerOption) *StreamConsumer {
	c := &StreamConsumer{
		client:        client,
		consumerGroup: consumerGroup,
		handlers:      make(map[string]map[string]StreamHandler),
		maxRetries:    maxRetries,
		concurrency:   1,
	}

	for _, opt := range opts {
		opt(c)
	}

	return c
}

func (c *StreamConsumer) RegisterHandler(stream, eventType string, handler StreamHandler) {
	if c.handlers[stream] == nil {
		c.handlers[stream] = make(map[string]StreamHandler)
	}
	c.handlers[stream][eventType] = handler
}

func (c *StreamConsumer) Start(ctx context.Context) {
	ctx, c.cancel = context.WithCancel(ctx)

	for stream := range c.handlers {
		for i := range c.concurrency {
			c.wg.Add(1)
			go c.consumeStream(ctx, stream, i+1)
		}
	}
}

func (c *StreamConsumer) consumeStream(ctx context.Context, stream string, consumerNum int) {
	defer c.wg.Done()

	consumerName := fmt.Sprintf("consumer-%d", consumerNum)

	if err := c.client.XGroupCreateMkStream(ctx, stream, c.consumerGroup, "0").Err(); err != nil {
		if !strings.HasPrefix(err.Error(), "BUSYGROUP ") {
			slog.Error("failed to create consumer group", "stream", stream, "group", c.consumerGroup, "err", err)
			return
		}
	}

	c.drainPending(ctx, stream, consumerName)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		result, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    c.consumerGroup,
			Consumer: consumerName,
			Streams:  []string{stream, ">"},
			Count:    10,
			Block:    2 * time.Second,
		}).Result()

		if err != nil {
			if err.Error() == "redis: nil" {
				continue
			}
			select {
			case <-ctx.Done():
				return
			default:
				slog.Error("xreadgroup error", "stream", stream, "consumer", consumerName, "err", err)
				continue
			}
		}

		for _, streamResult := range result {
			for _, msg := range streamResult.Messages {
				c.inflight.Store(msg.ID, stream)
				err := c.processMessage(ctx, stream, msg)
				if err != nil {
					c.handleFailure(ctx, stream, msg.ID, err)
				} else {
					c.client.XAck(ctx, stream, c.consumerGroup, msg.ID)
				}
				c.inflight.Delete(msg.ID)
			}
		}
	}
}

func (c *StreamConsumer) drainPending(ctx context.Context, stream string, consumerName string) {
	result, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    c.consumerGroup,
		Consumer: consumerName,
		Streams:  []string{stream, "0"},
		Count:    10,
		Block:    1 * time.Second,
	}).Result()
	if err != nil {
		return
	}

	for _, streamResult := range result {
		for _, msg := range streamResult.Messages {
			c.inflight.Store(msg.ID, stream)
			err := c.processMessage(ctx, stream, msg)
			if err != nil {
				c.handleFailure(ctx, stream, msg.ID, err)
			} else {
				c.client.XAck(ctx, stream, c.consumerGroup, msg.ID)
			}
			c.inflight.Delete(msg.ID)
		}
	}
}

func (c *StreamConsumer) processMessage(ctx context.Context, stream string, msg redis.XMessage) error {
	eventType, ok := msg.Values["event_type"].(string)
	if !ok {
		return fmt.Errorf("missing event_type in stream entry: %s", msg.ID)
	}

	payloadRaw, ok := msg.Values["payload"].(string)
	if !ok {
		return fmt.Errorf("missing payload in stream entry: %s", msg.ID)
	}

	handler, ok := c.handlers[stream][eventType]
	if !ok {
		return fmt.Errorf("no handler registered for stream %s event type %s", stream, eventType)
	}

	return handler(ctx, msg.ID, []byte(payloadRaw))
}

func (c *StreamConsumer) resolveNackMode(err error) NackMode {
	if handlerErr, ok := errors.AsType[*HandlerError](err); ok {
		return handlerErr.Mode
	}
	return NackModeFail
}

func (c *StreamConsumer) getAttemptCount(ctx context.Context, stream, group, msgID string) (int, error) {
	key := fmt.Sprintf("xnack:retry:%s:%s:%s", stream, group, msgID)
	count, err := c.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	_ = c.client.Expire(ctx, key, 24*time.Hour).Err()
	return int(count), nil
}

func (c *StreamConsumer) xnackAndAck(ctx context.Context, stream, msgID, mode string) {
	_, xnackErr := c.client.XNack(ctx, &redis.XNackArgs{
		Stream: stream,
		Group:  c.consumerGroup,
		Mode:   mode,
		IDs:    []string{msgID},
	}).Result()
	if xnackErr != nil {
		slog.Error("failed to xnack message", "stream", stream, "msg_id", msgID, "mode", mode, "err", xnackErr)
	}

	if ackErr := c.client.XAck(ctx, stream, c.consumerGroup, msgID).Err(); ackErr != nil {
		slog.Error("failed to ack message after xnack", "stream", stream, "msg_id", msgID, "err", ackErr)
	}
}

func (c *StreamConsumer) handleFailure(ctx context.Context, stream, msgID string, err error) {
	nackMode := c.resolveNackMode(err)

	if nackMode == NackModeFatal {
		slog.Error("message permanently failed (poison)", "stream", stream, "msg_id", msgID, "err", err)
		c.xnackAndAck(ctx, stream, msgID, redis.XNackModeFatal)
		return
	}

	count, countErr := c.getAttemptCount(ctx, stream, c.consumerGroup, msgID)
	if countErr != nil {
		slog.Error("failed to increment attempt count, falling back to XPendingExt", "stream", stream, "msg_id", msgID, "err", countErr)
		pending, peErr := c.client.XPendingExt(ctx, &redis.XPendingExtArgs{
			Stream: stream,
			Group:  c.consumerGroup,
			Start:  msgID,
			End:    msgID,
			Count:  1,
		}).Result()
		if peErr != nil || len(pending) == 0 {
			slog.Error("failed to check delivery count", "stream", stream, "msg_id", msgID, "err", peErr)
			return
		}
		count = int(pending[0].RetryCount)
	}

	if count >= c.maxRetries {
		slog.Error("message permanently failed (max retries exceeded)", "stream", stream, "msg_id", msgID, "attempts", count, "err", err)
		c.xnackAndAck(ctx, stream, msgID, redis.XNackModeFatal)
		return
	}

	redisMode := redis.XNackModeFail
	if nackMode == NackModeSilent {
		redisMode = redis.XNackModeSilent
	}

	slog.Warn("message processing failed, retrying", "stream", stream, "msg_id", msgID, "attempt", count, "mode", redisMode, "err", err)
	_, xnackErr := c.client.XNack(ctx, &redis.XNackArgs{
		Stream: stream,
		Group:  c.consumerGroup,
		Mode:   redisMode,
		IDs:    []string{msgID},
	}).Result()
	if xnackErr != nil {
		slog.Error("failed to xnack message", "stream", stream, "msg_id", msgID, "err", xnackErr)
	}
}

func (c *StreamConsumer) Shutdown() {
	if c.cancel != nil {
		c.cancel()
	}

	done := make(chan struct{})
	go func() {
		c.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(10 * time.Second):
	}

	ctx := context.Background()
	c.inflight.Range(func(key, value any) bool {
		msgID := key.(string)
		stream := value.(string)

		slog.Warn("nacking in-flight message on shutdown", "stream", stream, "msg_id", msgID)
		_, err := c.client.XNack(ctx, &redis.XNackArgs{
			Stream: stream,
			Group:  c.consumerGroup,
			Mode:   redis.XNackModeSilent,
			IDs:    []string{msgID},
		}).Result()
		if err != nil {
			slog.Error("failed to nack in-flight message on shutdown", "stream", stream, "msg_id", msgID, "err", err)
		}
		c.inflight.Delete(key)
		return true
	})
}
