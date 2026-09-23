package purge

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/utils"
)

type PurgeService struct {
	guidesRepo          interfaces.GuidesRepository
	storageService      interfaces.StorageService
	guideViewsService   interfaces.GuideViewsService
	activityLogsService interfaces.ActivityLogsService
	bucket              string
}

func NewPurgeService(guidesRepo interfaces.GuidesRepository, storageService interfaces.StorageService, guideViewsService interfaces.GuideViewsService, activityLogsService interfaces.ActivityLogsService, bucket string) *PurgeService {
	return &PurgeService{
		guidesRepo:          guidesRepo,
		storageService:      storageService,
		guideViewsService:   guideViewsService,
		activityLogsService: activityLogsService,
		bucket:              bucket,
	}
}

func (s *PurgeService) PurgeGuide(ctx context.Context, guideID string) error {
	ids, err := s.guidesRepo.GetPendingPurge(ctx)
	if err != nil {
		return fmt.Errorf("check eligibility: %w", err)
	}

	eligible := false
	for _, id := range ids {
		if id.String() == guideID {
			eligible = true
			break
		}
	}
	if !eligible {
		slog.Warn("guide no longer eligible for purge, skipping", "guide_id", guideID)
		return nil
	}

	prefix := utils.GuideUploadsPrefix(guideID)
	if err := s.storageService.DeleteObjectsByPrefix(ctx, s.bucket, prefix); err != nil {
		slog.Error("failed to delete S3 objects", "guide_id", guideID, "prefix", prefix, "err", err)
		return fmt.Errorf("delete S3 objects: %w", err)
	}

	// Runs before the hard delete so a failure is retried while the guide is still eligible.
	if err := s.activityLogsService.DeleteByTarget(ctx, models.ActivityTargetGuide, guideID); err != nil {
		slog.Error("failed to delete guide activity", "guide_id", guideID, "err", err)
		return fmt.Errorf("delete guide activity: %w", err)
	}

	if err := s.guidesRepo.HardDelete(ctx, guideID); err != nil {
		slog.Error("failed to hard delete guide", "guide_id", guideID, "err", err)
		return fmt.Errorf("hard delete guide: %w", err)
	}

	parsedGuideID, err := uuid.Parse(guideID)
	if err == nil {
		if err := s.guideViewsService.FlushGuideDedupeKeys(ctx, parsedGuideID); err != nil {
			slog.Error("failed to flush guide view dedupe keys", "guide_id", guideID, "err", err)
		}
	}

	return nil
}
