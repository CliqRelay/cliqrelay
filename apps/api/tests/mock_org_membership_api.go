package tests

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
	"github.com/stretchr/testify/mock"
)

type MockOrgMembershipAPI struct {
	mock.Mock
}

func (m *MockOrgMembershipAPI) GetMemberByUserID(ctx context.Context, actor *authulamodels.Actor, organizationID string, userID string) (*orgtypes.OrganizationMemberResponse, error) {
	args := m.Called(ctx, actor, organizationID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*orgtypes.OrganizationMemberResponse), args.Error(1)
}
