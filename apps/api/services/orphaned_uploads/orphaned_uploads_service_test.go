package orphaned_uploads

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

const bucket = "test-bucket"

func listing(pages ...[]types.StorageObject) func(mock.Arguments) {
	return func(args mock.Arguments) {
		visit := args.Get(3).(func([]types.StorageObject) error)
		for _, page := range pages {
			if err := visit(page); err != nil {
				return
			}
		}
	}
}

func old(key string) types.StorageObject {
	return types.StorageObject{Key: key, LastModified: time.Now().Add(-48 * time.Hour)}
}

func recent(key string) types.StorageObject {
	return types.StorageObject{Key: key, LastModified: time.Now().Add(-time.Minute)}
}

func TestOrphanedUploadsService_Sweep(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*tests.MockStorageService, *tests.MockMediaAssetsRepository)
		want    *types.OrphanSweepResult
		wantErr string
	}{
		{
			name: "deletes old keys without a row and keeps referenced ones",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{old("a"), old("b"), old("c")})).Return(nil).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"a", "b", "c"}).Return([]string{"b"}, nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a", "c"}).Return(nil).Once()
			},
			want: &types.OrphanSweepResult{Scanned: 3, Deleted: 2},
		},
		{
			name: "skips keys inside the grace period",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{recent("fresh"), old("stale")})).Return(nil).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"stale"}).Return([]string{}, nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"stale"}).Return(nil).Once()
			},
			want: &types.OrphanSweepResult{Scanned: 2, Skipped: 1, Deleted: 1},
		},
		{
			name: "makes no database or delete call when a page has no candidates",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{recent("fresh")})).Return(nil).Once()
			},
			want: &types.OrphanSweepResult{Scanned: 1, Skipped: 1},
		},
		{
			name: "does not delete when every candidate is referenced",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{old("a")})).Return(nil).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"a"}).Return([]string{"a"}, nil).Once()
			},
			want: &types.OrphanSweepResult{Scanned: 1},
		},
		{
			name: "accumulates counts across pages",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{old("a")}, []types.StorageObject{old("b"), recent("c")})).Return(nil).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"a"}).Return([]string{}, nil).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"b"}).Return([]string{}, nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a"}).Return(nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"b"}).Return(nil).Once()
			},
			want: &types.OrphanSweepResult{Scanned: 3, Skipped: 1, Deleted: 2},
		},
		{
			name: "returns list error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).Return(errors.New("s3 down")).Once()
			},
			wantErr: "s3 down",
		},
		{
			name: "returns database error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{old("a")})).Return(errors.New("db down")).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"a"}).Return(nil, errors.New("db down")).Once()
			},
			wantErr: "db down",
		},
		{
			name: "returns delete error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockMediaAssetsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "uploads/guides/", mock.Anything).
					Run(listing([]types.StorageObject{old("a")})).Return(errors.New("delete failed")).Once()
				repo.On("ExistingStoragePaths", mock.Anything, []string{"a"}).Return([]string{}, nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a"}).Return(errors.New("delete failed")).Once()
			},
			wantErr: "delete failed",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			storage := new(tests.MockStorageService)
			repo := new(tests.MockMediaAssetsRepository)
			tt.setup(storage, repo)
			svc := NewOrphanedUploadsService(repo, storage, bucket)

			result, err := svc.Sweep(context.Background())

			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				assert.Nil(t, result)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tt.want, result)
			}
			storage.AssertExpectations(t)
			repo.AssertExpectations(t)
		})
	}
}
