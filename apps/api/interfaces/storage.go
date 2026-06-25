package interfaces

import (
	"context"
	"io"
)

type StorageService interface {
	GetObject(ctx context.Context, bucket string, key string) (io.ReadCloser, error)
	PutObject(ctx context.Context, bucket string, key string, body io.Reader, contentType string) error
	CopyObject(ctx context.Context, bucket string, sourceKey string, destinationKey string) error
	DeleteObject(ctx context.Context, bucket string, key string) error
	DeleteObjectsByPrefix(ctx context.Context, bucket string, prefix string) error
}
