package tests

import (
	"context"

	"github.com/stretchr/testify/mock"
)

type MockPresignService struct {
	mock.Mock
}

func (m *MockPresignService) GetURL(ctx context.Context, bucket, key string) (string, error) {
	args := m.Called(ctx, bucket, key)
	return args.String(0), args.Error(1)
}

func (m *MockPresignService) PutURL(ctx context.Context, bucket, key, contentType string) (string, error) {
	args := m.Called(ctx, bucket, key, contentType)
	return args.String(0), args.Error(1)
}
