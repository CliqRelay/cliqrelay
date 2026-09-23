package realtime

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/types"
)

const StreamTicketTTL = 30 * time.Second

func streamTicketKey(ticket string) string {
	return "realtime:ticket:" + ticket
}

func (s *RealtimeService) IssueTicket(ctx context.Context, userID string, teamID uuid.UUID) (*types.RealtimeTicket, error) {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		return nil, err
	}
	ticket := base64.RawURLEncoding.EncodeToString(token)

	claims, err := json.Marshal(types.RealtimeTicketClaims{UserID: userID, TeamID: teamID})
	if err != nil {
		return nil, err
	}

	if err := s.redisClient.Set(ctx, streamTicketKey(ticket), claims, StreamTicketTTL).Err(); err != nil {
		return nil, err
	}

	return &types.RealtimeTicket{
		Ticket:    ticket,
		ExpiresAt: time.Now().Add(StreamTicketTTL).UTC(),
	}, nil
}

func (s *RealtimeService) RedeemTicket(ctx context.Context, ticket string) (*types.RealtimeTicketClaims, error) {
	if ticket == "" {
		return nil, constants.ErrInvalidStreamTicket
	}

	data, err := s.redisClient.GetDel(ctx, streamTicketKey(ticket)).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, constants.ErrInvalidStreamTicket
		}
		return nil, err
	}

	var claims types.RealtimeTicketClaims
	if err := json.Unmarshal(data, &claims); err != nil {
		return nil, constants.ErrInvalidStreamTicket
	}
	return &claims, nil
}
