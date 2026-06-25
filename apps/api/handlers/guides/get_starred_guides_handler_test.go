package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/models"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestGetStarredGuidesHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		setup          func(*tests.MockStarredGuidesRepository)
		expectedStatus int
		expectedLen    int
	}{
		{
			name: "success",
			setup: func(mockRepo *tests.MockStarredGuidesRepository) {
				mockRepo.On("GetStarredGuides", mock.Anything, "test-user-123").
					Return([]*models.Guide{
						{ID: uuid.New(), CreatorID: "test-user-123", Title: "Starred Guide 1", Status: models.StatusDraft, IsStarred: true},
						{ID: uuid.New(), CreatorID: "test-user-123", Title: "Starred Guide 2", Status: models.StatusDraft, IsStarred: true},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name: "empty list",
			setup: func(mockRepo *tests.MockStarredGuidesRepository) {
				mockRepo.On("GetStarredGuides", mock.Anything, "test-user-123").
					Return([]*models.Guide{}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name: "service error",
			setup: func(mockRepo *tests.MockStarredGuidesRepository) {
				mockRepo.On("GetStarredGuides", mock.Anything, "test-user-123").
					Return([]*models.Guide{}, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockStarredGuidesRepository)
			tt.setup(mockRepo)
			svc := starredguidesservice.NewStarredGuidesService(mockRepo)
			handler := handlersguides.NewGetStarredGuidesHandler(appConfig, svc)

			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/guides/starred", nil)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllGuidesResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Guides, tt.expectedLen)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, assert.AnError.Error())
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
