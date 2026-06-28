package tests

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/models"
)

type MockIdentityService struct {
	mock.Mock
}

func (m *MockIdentityService) Current(ctx context.Context) *models.Identity {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*models.Identity)
}
