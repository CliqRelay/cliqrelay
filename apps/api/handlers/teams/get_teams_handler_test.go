package teams_test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	handlersteams "github.com/CliqRelay/cliqrelay/handlers/teams"
	"github.com/CliqRelay/cliqrelay/models"
	teamsservice "github.com/CliqRelay/cliqrelay/services/teams"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetTeamsHandler_Handle(t *testing.T) {
	t.Parallel()

	createdAt := time.Date(2026, 3, 4, 9, 30, 0, 0, time.FixedZone("CET", 60*60))
	updatedAt := createdAt.Add(2 * time.Hour)

	cases := []struct {
		name           string
		rows           []*models.Team
		repoErr        error
		expectedStatus int
		assertPayload  func(*testing.T, *types.GetAllTeamsResponse)
		expectedMsg    string
	}{
		{
			name: "returns the teams with the organization owner and RFC3339 timestamps",
			rows: []*models.Team{
				{
					ID:             "team-1",
					Name:           "Design",
					OrganizationID: "org-1",
					OwnerID:        "org-owner-456",
					CreatedAt:      createdAt,
					UpdatedAt:      updatedAt,
				},
			},
			expectedStatus: http.StatusOK,
			assertPayload: func(t *testing.T, resp *types.GetAllTeamsResponse) {
				require.Len(t, resp.Teams, 1)
				team := resp.Teams[0]
				assert.Equal(t, "team-1", team.ID)
				assert.Equal(t, "Design", team.Name)
				assert.Equal(t, "org-1", team.OrganizationID)
				assert.Equal(t, "org-owner-456", team.OwnerID, "owner_id must be the org owner, not the caller")

				parsedCreated, err := time.Parse(time.RFC3339, team.CreatedAt)
				require.NoError(t, err)
				assert.True(t, createdAt.Equal(parsedCreated), "created_at must survive the round trip in UTC")

				parsedUpdated, err := time.Parse(time.RFC3339, team.UpdatedAt)
				require.NoError(t, err)
				assert.True(t, updatedAt.Equal(parsedUpdated))
			},
		},
		{
			name:           "returns an empty array rather than null when there are no teams",
			rows:           []*models.Team{},
			expectedStatus: http.StatusOK,
			assertPayload: func(t *testing.T, resp *types.GetAllTeamsResponse) {
				assert.NotNil(t, resp.Teams)
				assert.Empty(t, resp.Teams)
			},
		},
		{
			name:           "surfaces repository failures instead of reporting no teams",
			repoErr:        errors.New("database is down"),
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    "database is down",
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			repo := new(tests.MockTeamsRepository)
			repo.On("GetAllAccessibleByUserID", mock.Anything, "test-user-123").Return(tt.rows, tt.repoErr)
			handler := handlersteams.NewGetTeamsHandler(
				usecases.NewTeamsUseCase(teamsservice.NewTeamsService(repo)),
			)
			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/teams", nil)

			// Act
			handler.Handle()(req.W, req.Req)

			// Assert
			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)
			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllTeamsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				tt.assertPayload(t, &resp)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}
			repo.AssertExpectations(t)
		})
	}
}

func TestGetTeamsHandler_HandleMarshalsEmptyTeamsAsArray(t *testing.T) {
	t.Parallel()

	// Arrange
	repo := new(tests.MockTeamsRepository)
	repo.On("GetAllAccessibleByUserID", mock.Anything, "test-user-123").Return([]*models.Team{}, nil)
	handler := handlersteams.NewGetTeamsHandler(
		usecases.NewTeamsUseCase(teamsservice.NewTeamsService(repo)),
	)
	req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/teams", nil)

	// Act
	handler.Handle()(req.W, req.Req)

	// Assert
	require.True(t, req.ReqCtx.ResponseReady)
	assert.JSONEq(t, `{"teams":[]}`, string(req.ReqCtx.ResponseBody))
	repo.AssertExpectations(t)
}
