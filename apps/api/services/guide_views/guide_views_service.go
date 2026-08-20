package guideviews

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

const dedupeTTL = 24 * time.Hour

func dedupeUserKey(guideID, userID uuid.UUID) string {
	return fmt.Sprintf("dedupe:guide-views:{%s}:user:%s", guideID.String(), userID.String())
}

func dedupePatternByGuide(guideID uuid.UUID) string {
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

	parsedViewedAt, err := time.Parse(time.RFC3339, viewedAt)
	if err != nil {
		return fmt.Errorf("parse viewed at: %w", err)
	}

	var dedupeKey string
	if viewerID != nil {
		dedupeKey = dedupeUserKey(guide.ID, *viewerID)

		exists, err := s.redisClient.Exists(ctx, dedupeKey).Result()
		if err == nil && exists > 0 {
			return nil
		}
	}

	var ipHashPtr *string
	if ipHash != "" {
		ipHashPtr = &ipHash
	}
	var userAgentPtr *string
	if userAgent != "" {
		userAgentPtr = &userAgent
	}

	if err := s.repo.Create(ctx, &types.CreateGuideViewDTO{
		TeamID:          teamID,
		GuideID:         guide.ID,
		ViewerID:        viewerID,
		IPHash:          ipHashPtr,
		UserAgent:       userAgentPtr,
		DurationSeconds: guide.DurationSeconds,
		ViewedAt:        parsedViewedAt,
	}); err != nil {
		return fmt.Errorf("create guide view: %w", err)
	}

	// Only dedupe once the view is actually persisted, otherwise a failed insert
	// would suppress every retry for the next 24 hours.
	if dedupeKey != "" {
		if err := s.redisClient.Set(ctx, dedupeKey, "1", dedupeTTL).Err(); err != nil {
			slog.Error("failed setting guide view dedupe key", "guide_id", guide.ID, "err", err)
		}
	}

	return nil
}

func (s *GuideViewsService) FlushGuideDedupeKeys(ctx context.Context, guideID uuid.UUID) error {
	pattern := dedupePatternByGuide(guideID)

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
