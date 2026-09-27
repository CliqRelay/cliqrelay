package organizations_test

import (
	"errors"
	"net/http"
	"testing"

	coreerrors "github.com/Authula/authula/core/errors"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlersorganizations "github.com/CliqRelay/cliqrelay/handlers/organizations"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetMyMembershipHandler_Handle(t *testing.T) {
	t.Parallel()

	editor := &orgtypes.OrganizationMemberResponse{ID: "member-1", OrganizationID: "org-1", Role: "editor"}

	cases := []struct {
		name           string
		path           string
		orgID          string
		setup          func(*tests.MockOrgMembershipAPI)
		expectedStatus int
		expectedMember *orgtypes.OrganizationMemberResponse
		expectedMsg    string
	}{
		{
			name:  "returns the caller's membership row",
			path:  "/api/v1/organizations/org-1/members/me",
			orgID: "org-1",
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, mock.Anything, "org-1", "test-user-123").Return(editor, nil).Once()
			},
			expectedStatus: http.StatusOK,
			expectedMember: editor,
		},
		{
			name:  "looks up the actor even when another user id is smuggled into the query",
			path:  "/api/v1/organizations/org-1/members/me?user_id=someone-else&userId=someone-else",
			orgID: "org-1",
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, mock.Anything, "org-1", "test-user-123").Return(editor, nil).Once()
			},
			expectedStatus: http.StatusOK,
			expectedMember: editor,
		},
		{
			name:  "responds 404 when the caller is not a member",
			path:  "/api/v1/organizations/org-1/members/me",
			orgID: "org-1",
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, mock.Anything, "org-1", "test-user-123").Return(nil, coreerrors.ErrForbidden).Once()
			},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrOrganizationMemberNotFound.Error(),
		},
		{
			name:  "responds with the same 404 when the organization does not exist",
			path:  "/api/v1/organizations/org-404/members/me",
			orgID: "org-404",
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, mock.Anything, "org-404", "test-user-123").Return(nil, coreerrors.ErrNotFound).Once()
			},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrOrganizationMemberNotFound.Error(),
		},
		{
			name:  "responds with the same 404 when the lookup fails",
			path:  "/api/v1/organizations/org-1/members/me",
			orgID: "org-1",
			setup: func(api *tests.MockOrgMembershipAPI) {
				api.On("GetMemberByUserID", mock.Anything, mock.Anything, "org-1", "test-user-123").Return(nil, errors.New("database is down")).Once()
			},
			expectedStatus: http.StatusNotFound,
			expectedMsg:    constants.ErrOrganizationMemberNotFound.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			api := new(tests.MockOrgMembershipAPI)
			tt.setup(api)
			handler := handlersorganizations.NewGetMyMembershipHandler(usecases.NewOrganizationsUseCase(api))
			req := tests.NewHandlerRequest(t, http.MethodGet, tt.path, nil)
			req.Req.SetPathValue("org_id", tt.orgID)

			// Act
			handler.Handle()(req.W, req.Req)

			// Assert
			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)
			if tt.expectedStatus == http.StatusOK {
				var resp orgtypes.OrganizationMemberResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, *tt.expectedMember, resp)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}
			api.AssertExpectations(t)
		})
	}
}
