package export_cleanup

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

func expired(key string) types.StorageObject {
	return types.StorageObject{Key: key, LastModified: time.Now().Add(-48 * time.Hour)}
}

func fresh(key string) types.StorageObject {
	return types.StorageObject{Key: key, LastModified: time.Now().Add(-time.Minute)}
}

func TestExportCleanupService_Sweep(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*tests.MockStorageService, *tests.MockGuideExportsRepository)
		want    *types.ExportCleanupResult
		wantErr string
	}{
		{
			name: "deletes expired exports and prunes rows",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).
					Run(listing([]types.StorageObject{expired("a"), expired("b"), fresh("c")})).Return(nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a", "b"}).Return(nil).Once()
				repo.On("DeleteOlderThan", mock.Anything, mock.Anything).Return(int64(5), nil).Once()
			},
			want: &types.ExportCleanupResult{Scanned: 3, Skipped: 1, Deleted: 2, RowsDeleted: 5},
		},
		{
			name: "skips exports inside the retention window",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).
					Run(listing([]types.StorageObject{fresh("a")})).Return(nil).Once()
				repo.On("DeleteOlderThan", mock.Anything, mock.Anything).Return(int64(0), nil).Once()
			},
			want: &types.ExportCleanupResult{Scanned: 1, Skipped: 1},
		},
		{
			name: "accumulates counts across pages",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).
					Run(listing([]types.StorageObject{expired("a")}, []types.StorageObject{expired("b"), fresh("c")})).Return(nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a"}).Return(nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"b"}).Return(nil).Once()
				repo.On("DeleteOlderThan", mock.Anything, mock.Anything).Return(int64(2), nil).Once()
			},
			want: &types.ExportCleanupResult{Scanned: 3, Skipped: 1, Deleted: 2, RowsDeleted: 2},
		},
		{
			name: "returns list error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).Return(errors.New("s3 down")).Once()
			},
			wantErr: "s3 down",
		},
		{
			name: "returns delete error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).
					Run(listing([]types.StorageObject{expired("a")})).Return(errors.New("delete failed")).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a"}).Return(errors.New("delete failed")).Once()
			},
			wantErr: "delete failed",
		},
		{
			name: "returns database error",
			setup: func(storage *tests.MockStorageService, repo *tests.MockGuideExportsRepository) {
				storage.On("ListObjects", mock.Anything, bucket, "exports/guides/", mock.Anything).
					Run(listing([]types.StorageObject{expired("a")})).Return(nil).Once()
				storage.On("DeleteObjects", mock.Anything, bucket, []string{"a"}).Return(nil).Once()
				repo.On("DeleteOlderThan", mock.Anything, mock.Anything).Return(int64(0), errors.New("db down")).Once()
			},
			wantErr: "db down",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			storage := new(tests.MockStorageService)
			repo := new(tests.MockGuideExportsRepository)
			tt.setup(storage, repo)
			svc := NewExportCleanupService(storage, repo, bucket)

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
