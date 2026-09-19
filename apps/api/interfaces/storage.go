package interfaces

import (
	"context"
	"io"

	"github.com/CliqRelay/cliqrelay/types"
)

type StorageService interface {
	GetObject(ctx context.Context, bucket string, key string) (io.ReadCloser, error)
	PutObject(ctx context.Context, bucket string, key string, body io.Reader, contentType string) error
	CopyObject(ctx context.Context, bucket string, sourceKey string, destinationKey string) error
	DeleteObject(ctx context.Context, bucket string, key string) error
	DeleteObjects(ctx context.Context, bucket string, keys []string) error
	DeleteObjectsByPrefix(ctx context.Context, bucket string, prefix string) error
	ListObjects(ctx context.Context, bucket string, prefix string, visit func(objects []types.StorageObject) error) error
}
