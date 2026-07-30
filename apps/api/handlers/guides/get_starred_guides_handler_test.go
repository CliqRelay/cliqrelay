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
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

const testPageSize = 10

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
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return([]*types.GuideWithStarred{
						{Guide: models.Guide{ID: uuid.New(), CreatorID: new("test-user-123"), Title: "Starred Guide 1", Status: models.StatusDraft, IsStarred: true}, IsStarred: true},
						{Guide: models.Guide{ID: uuid.New(), CreatorID: new("test-user-123"), Title: "Starred Guide 2", Status: models.StatusDraft, IsStarred: true}, IsStarred: true},
					}, 2, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name: "empty list",
			setup: func(mockRepo *tests.MockStarredGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return([]*types.GuideWithStarred{}, 0, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name: "service error",
			setup: func(mockRepo *tests.MockStarredGuidesRepository) {
				mockRepo.On("GetAll", mock.Anything, mock.Anything).
					Return([]*types.GuideWithStarred{}, 0, assert.AnError).
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
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("GuideListFilter", mock.Anything, mock.Anything, mock.Anything).Return(&types.GuideFilter{}, nil)
			starredSvc := starredguidesservice.NewStarredGuidesService(mockRepo, mockGuidesRepo)
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, mockRepo, nil, nil, nil)
			uc := usecases.NewGuidesUseCase(mockAuthz, guidesSvc, starredSvc)
			handler := handlersguides.NewGetStarredGuidesHandler(appConfig, uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/guides/starred", nil)
			q := req.Req.URL.Query()
			q.Set("team_id", uuid.New().String())
			q.Set("page", "1")
			q.Set("limit", "10")
			req.Req.URL.RawQuery = q.Encode()

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetStarredGuidesResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Data, tt.expectedLen)
				assert.Equal(t, tt.expectedLen, resp.Total)
				assert.Equal(t, 1, resp.Page)
				assert.Equal(t, 10, resp.Limit)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, assert.AnError.Error())
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
