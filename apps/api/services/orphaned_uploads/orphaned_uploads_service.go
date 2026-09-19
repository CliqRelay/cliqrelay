package orphaned_uploads

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/utils"
)

// Objects younger than this may belong to an upload whose media_assets row has not been written yet.
const orphanGracePeriod = 24 * time.Hour

type OrphanedUploadsService struct {
	mediaAssetsRepo interfaces.MediaAssetsRepository
	storageService  interfaces.StorageService
	bucket          string
}

func NewOrphanedUploadsService(mediaAssetsRepo interfaces.MediaAssetsRepository, storageService interfaces.StorageService, bucket string) *OrphanedUploadsService {
	return &OrphanedUploadsService{
		mediaAssetsRepo: mediaAssetsRepo,
		storageService:  storageService,
		bucket:          bucket,
	}
}

func (s *OrphanedUploadsService) Sweep(ctx context.Context) (*types.OrphanSweepResult, error) {
	result := &types.OrphanSweepResult{}
	cutoff := time.Now().Add(-orphanGracePeriod)

	err := s.storageService.ListObjects(ctx, s.bucket, utils.GuideUploadsRoot, func(objects []types.StorageObject) error {
		result.Scanned += len(objects)

		candidates := make([]string, 0, len(objects))
		for _, obj := range objects {
			if obj.LastModified.After(cutoff) {
				result.Skipped++
				continue
			}
			candidates = append(candidates, obj.Key)
		}
		if len(candidates) == 0 {
			return nil
		}

		existing, err := s.mediaAssetsRepo.ExistingStoragePaths(ctx, candidates)
		if err != nil {
			return fmt.Errorf("look up storage paths: %w", err)
		}
		referenced := make(map[string]struct{}, len(existing))
		for _, path := range existing {
			referenced[path] = struct{}{}
		}

		orphans := make([]string, 0, len(candidates))
		for _, key := range candidates {
			if _, ok := referenced[key]; !ok {
				orphans = append(orphans, key)
			}
		}
		if len(orphans) == 0 {
			return nil
		}

		if err := s.storageService.DeleteObjects(ctx, s.bucket, orphans); err != nil {
			return fmt.Errorf("delete orphaned objects: %w", err)
		}
		for _, key := range orphans {
			slog.Info("deleted orphaned upload", "storage_path", key)
		}
		result.Deleted += len(orphans)
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("sweep orphaned uploads: %w", err)
	}

	return result, nil
}
