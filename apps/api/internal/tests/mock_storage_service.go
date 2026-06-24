package tests

import (
	"context"
	"io"

	"github.com/stretchr/testify/mock"
)

type MockStorageService struct {
	mock.Mock
}

func (m *MockStorageService) GetObject(ctx context.Context, bucket, key string) (io.ReadCloser, error) {
	args := m.Called(ctx, bucket, key)
	return args.Get(0).(io.ReadCloser), args.Error(1)
}

func (m *MockStorageService) PutObject(ctx context.Context, bucket, key string, body io.Reader, contentType string) error {
	args := m.Called(ctx, bucket, key, body, contentType)
	return args.Error(0)
}

func (m *MockStorageService) DeleteObject(ctx context.Context, bucket, key string) error {
	args := m.Called(ctx, bucket, key)
	return args.Error(0)
}

func (m *MockStorageService) CopyObject(ctx context.Context, bucket, sourceKey, destinationKey string) error {
	args := m.Called(ctx, bucket, sourceKey, destinationKey)
	return args.Error(0)
}

func (m *MockStorageService) DeleteObjectsByPrefix(ctx context.Context, bucket, prefix string) error {
	args := m.Called(ctx, bucket, prefix)
	return args.Error(0)
}
