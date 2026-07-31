package guideviews

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/utils"
)

const dedupTTL = 24 * time.Hour

func dedupUserKey(guideID, userID uuid.UUID) string {
	return fmt.Sprintf("dedupe:guide-views:{%s}:user:%s", guideID.String(), userID.String())
}

func dedupPatternByGuide(guideID uuid.UUID) string {
	return fmt.Sprintf("dedupe:guide-views:{%s}:*", guideID.String())
}

type GuideViewsService struct {
	repo        interfaces.GuideViewsRepository
	redisClient *redis.Client
}

func NewGuideViewsService(repo interfaces.GuideViewsRepository, redisClient *redis.Client) *GuideViewsService {
	return &GuideViewsService{repo: repo, redisClient: redisClient}
}

func (s *GuideViewsService) RecordView(ctx context.Context, teamID uuid.UUID, guide *models.Guide, viewerID *uuid.UUID, ipHash, userAgent, viewedAt string) error {
	if guide.Status != models.StatusPublished {
		return constants.ErrGuideNotPublished
	}

	if viewerID != nil {
		dedupKey := dedupUserKey(guide.ID, *viewerID)

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
		GuideID:   guide.ID,
		ViewerID:  viewerID,
		IPHash:    ipHashPtr,
		UserAgent: userAgentPtr,
		ViewedAt:  viewedAt,
	}); err != nil {
		return fmt.Errorf("publish guide view event: %w", err)
	}

	return nil
}

func (s *GuideViewsService) FlushGuideDedupeKeys(ctx context.Context, guideID uuid.UUID) error {
	pattern := dedupPatternByGuide(guideID)

	var (
		cursor       uint64
		keysToDelete []string
	)

	// Keep looping through until we find all the keys to delete
	for {
		keys, nextCursor, err := s.redisClient.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("failed scanning dedupe keys: %w", err)
		}

		keysToDelete = append(keysToDelete, keys...)

		cursor = nextCursor
		if cursor == 0 { // Cursor 0 means Redis finished the full scan
			break
		}
	}

	// Delete all the scanned keys in one batch
	if len(keysToDelete) > 0 {
		if err := s.redisClient.Del(ctx, keysToDelete...).Err(); err != nil {
			return fmt.Errorf("failed deleting dedupe keys: %w", err)
		}
	}

	return nil
}

func (s *GuideViewsService) GetCountByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error) {
	return s.repo.GetCountByTeam(ctx, teamID, since)
}

func (s *GuideViewsService) GetTimeSavedByTeam(ctx context.Context, teamID uuid.UUID, since *time.Time) (int, error) {
	stats, err := s.repo.GetTimeSavedByTeam(ctx, teamID, since)
	if err != nil {
		return 0, err
	}

	total := 0
	for _, stat := range stats {
		total += stat.ViewCount * utils.CalculateNetSecondsSaved(stat.DurationSeconds)
	}
	return total, nil
}
