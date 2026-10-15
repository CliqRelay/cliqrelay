package purge

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/utils"
)

type PurgeService struct {
	guidesRepo     interfaces.GuidesRepository
	storageService interfaces.StorageService
	bucket         string
}

func NewPurgeService(guidesRepo interfaces.GuidesRepository, storageService interfaces.StorageService, bucket string) *PurgeService {
	return &PurgeService{
		guidesRepo:     guidesRepo,
		storageService: storageService,
		bucket:         bucket,
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

	exportPrefix := utils.GuideExportsPrefix(guideID)
	if err := s.storageService.DeleteObjectsByPrefix(ctx, s.bucket, exportPrefix); err != nil {
		slog.Error("failed to delete exported guides", "guide_id", guideID, "prefix", exportPrefix, "err", err)
		return fmt.Errorf("delete exported guides: %w", err)
	}

	if err := s.guidesRepo.HardDelete(ctx, guideID); err != nil {
		slog.Error("failed to hard delete guide", "guide_id", guideID, "err", err)
		return fmt.Errorf("hard delete guide: %w", err)
	}

	return nil
}
