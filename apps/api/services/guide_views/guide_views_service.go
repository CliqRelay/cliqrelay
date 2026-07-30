package guideviews

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
)

const dedupTTL = 24 * time.Hour

type GuideViewsService struct {
	repo        interfaces.GuideViewsRepository
	redisClient *redis.Client
}

func NewGuideViewsService(repo interfaces.GuideViewsRepository, redisClient *redis.Client) *GuideViewsService {
	return &GuideViewsService{repo: repo, redisClient: redisClient}
}

func (s *GuideViewsService) RecordView(ctx context.Context, teamID, guideID uuid.UUID, viewerID *uuid.UUID, ipHash, userAgent, viewedAt string) error {
	if viewerID != nil {
		dedupKey := fmt.Sprintf("dedup:guide-view:user:%s:%s", viewerID.String(), guideID.String())

		exists, err := s.redisClient.Exists(ctx, dedupKey).Result()
		if err == nil && exists > 0 {
			return nil
		}

		defer func() {
			_ = s.redisClient.Set(ctx, dedupKey, "1", dedupTTL).Err()
		}()
	}

	var ipHashPtr *string
	if ipHash != "" {
		ipHashPtr = &ipHash
	}
	var userAgentPtr *string
	if userAgent != "" {
		userAgentPtr = &userAgent
	}

	if err := events.Publish(ctx, s.redisClient, events.TopicGuideViews, events.EventTypeGuideViewed, &events.GuideViewPayload{
		TeamID:    teamID,
		GuideID:   guideID,
		ViewerID:  viewerID,
		IPHash:    ipHashPtr,
		UserAgent: userAgentPtr,
		ViewedAt:  viewedAt,
	}); err != nil {
		return fmt.Errorf("publish guide view event: %w", err)
	}

	return nil
}

func (s *GuideViewsService) GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error) {
	return s.repo.GetCountByTeam(ctx, teamID, since)
}
