package interfaces

import "context"

type PresignService interface {
	GetURL(ctx context.Context, bucket string, key string) (string, error)
	PutURL(ctx context.Context, bucket string, key string, contentType string) (string, error)
}
