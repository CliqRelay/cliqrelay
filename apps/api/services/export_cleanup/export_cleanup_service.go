package export_cleanup

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

const exportRetentionPeriod = 24 * time.Hour

type ExportCleanupService struct {
	storageService   interfaces.StorageService
	guideExportsRepo interfaces.GuideExportsRepository
	bucket           string
}

func NewExportCleanupService(storageService interfaces.StorageService, guideExportsRepo interfaces.GuideExportsRepository, bucket string) *ExportCleanupService {
	return &ExportCleanupService{
		storageService:   storageService,
		guideExportsRepo: guideExportsRepo,
		bucket:           bucket,
	}
}

func (s *ExportCleanupService) Sweep(ctx context.Context) (*types.ExportCleanupResult, error) {
	result := &types.ExportCleanupResult{}
	cutoff := time.Now().Add(-exportRetentionPeriod)

	err := s.storageService.ListObjects(ctx, s.bucket, utils.GuideExportsRoot, func(objects []types.StorageObject) error {
		result.Scanned += len(objects)

		expired := make([]string, 0, len(objects))
		for _, obj := range objects {
			if obj.LastModified.After(cutoff) {
				result.Skipped++
				continue
			}
			expired = append(expired, obj.Key)
		}
		if len(expired) == 0 {
			return nil
		}

		if err := s.storageService.DeleteObjects(ctx, s.bucket, expired); err != nil {
			return fmt.Errorf("delete expired exports: %w", err)
		}
		for _, key := range expired {
			slog.Info("deleted expired export", "storage_path", key)
		}
		result.Deleted += len(expired)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("sweep exports: %w", err)
	}

	rowsDeleted, err := s.guideExportsRepo.DeleteOlderThan(ctx, cutoff)
	if err != nil {
		return nil, fmt.Errorf("delete expired export rows: %w", err)
	}
	result.RowsDeleted = rowsDeleted

	return result, nil
}
