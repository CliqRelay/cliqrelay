package guides_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	handlersguides "github.com/CliqRelay/cliqrelay/handlers/guides"
	guideviewsservice "github.com/CliqRelay/cliqrelay/services/guide_views"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetTimeSavedHandler(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name           string
		path           string
		query          map[string]string
		setup          func(*tests.MockGuideViewsRepository)
		expectedStatus int
		expectedMsg    string
		expected       func(*types.GetTimeSavedResponse)
	}{
		{
			name:  "success",
			path:  "/api/v1/guides/time-saved",
			query: map[string]string{"team_id": uuid.New().String()},
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, mock.Anything, mock.Anything).
					Return([]*types.GuideViewStats{
						{GuideID: uuid.New(), ViewCount: 2, DurationSeconds: 30},
						{GuideID: uuid.New(), ViewCount: 1, DurationSeconds: 600},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expected: func(resp *types.GetTimeSavedResponse) {
				assert.Equal(t, 1380, resp.TimeSavedSeconds)
				assert.Equal(t, 0.4, resp.TimeSavedHours)
			},
		},
		{
			name:  "no views returns zero",
			path:  "/api/v1/guides/time-saved",
			query: map[string]string{"team_id": uuid.New().String()},
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, mock.Anything, mock.Anything).
					Return([]*types.GuideViewStats{}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expected: func(resp *types.GetTimeSavedResponse) {
				assert.Equal(t, 0, resp.TimeSavedSeconds)
				assert.Equal(t, 0.0, resp.TimeSavedHours)
			},
		},
		{
			name:           "invalid team id",
			path:           "/api/v1/guides/time-saved",
			query:          map[string]string{"team_id": "not-a-uuid"},
			setup:          func(mockRepo *tests.MockGuideViewsRepository) {},
			expectedStatus: http.StatusBadRequest,
			expectedMsg:    "invalid team ID",
		},
		{
			name:           "invalid since timestamp",
			path:           "/api/v1/guides/time-saved",
			query:          map[string]string{"team_id": uuid.New().String(), "since": "not-a-timestamp"},
			setup:          func(mockRepo *tests.MockGuideViewsRepository) {},
			expectedStatus: http.StatusBadRequest,
			expectedMsg:    "invalid since timestamp",
		},
		{
			name:  "service error",
			path:  "/api/v1/guides/time-saved",
			query: map[string]string{"team_id": uuid.New().String()},
			setup: func(mockRepo *tests.MockGuideViewsRepository) {
				mockRepo.On("GetTimeSavedByTeam", mock.Anything, mock.Anything, mock.Anything).
					Return([]*types.GuideViewStats{}, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
			expectedMsg:    assert.AnError.Error(),
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockRepo := new(tests.MockGuideViewsRepository)
			tt.setup(mockRepo)
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("GuideListFilter", mock.Anything, mock.Anything, mock.Anything).Return(&types.GuideFilter{}, nil)
			svc := guideviewsservice.NewGuideViewsService(mockRepo, nil)
			uc := usecases.NewGuideViewsUseCase(mockAuthz, nil, svc)
			handler := handlersguides.NewGetTimeSavedHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, tt.path, nil)

			q := req.Req.URL.Query()
			for k, v := range tt.query {
				q.Set(k, v)
			}
			req.Req.URL.RawQuery = q.Encode()
			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetTimeSavedResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				tt.expected(&resp)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMsg)
			}

			mockRepo.AssertExpectations(t)
		})
	}
}
