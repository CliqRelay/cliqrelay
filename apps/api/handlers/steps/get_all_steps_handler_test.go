package steps_test

import (
	"log/slog"
	"net/http"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/config"
	handlerssteps "github.com/CliqRelay/cliqrelay/handlers/steps"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestGetAllStepsHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}

	cases := []struct {
		name           string
		guideID        string
		setup          func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		expectedStatus int
		expectedLen    int
	}{
		{
			name:    "success",
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
						{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "b0", Action: new(models.StepActionInput)},
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
		},
		{
			name:    "empty list",
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
		},
		{
			name:    "returns steps with media assets",
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{
						{
							ID:        uuid.New(),
							GuideID:   uuid.New(),
							SortOrder: "a0",
							Action:    new(models.StepActionClick),
							MediaAssets: []*models.MediaAsset{
								{ID: uuid.New(), StepID: uuid.New(), StoragePath: "/path/to/image.png"},
							},
						},
					}, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", "/path/to/image.png").
					Return("https://presigned.test/asset", nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    1,
		},
		{
			name:    "service error from guidesRepo.GetByID",
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:    "service error from stepsRepo.GetByGuideID",
			guideID: uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(&models.Guide{
						ID:        uuid.New(),
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByGuideID", mock.Anything, mock.AnythingOfType("string")).
					Return([]*models.Step{}, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(mockStepsRepo, mockGuidesRepo, mockPresignClient)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger, mockIdentity, mockAuthz, (*interfaces.StepHooks)(nil))
			handler := handlerssteps.NewGetAllStepsHandler(appConfig, svc)

			path := "/api/v1/steps?guideId=" + tt.guideID
			req := tests.NewHandlerRequest(t, http.MethodGet, path, nil)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllStepsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Steps, tt.expectedLen)
				if tt.name == "returns steps with media assets" {
					require.Len(t, resp.Steps[0].MediaAssets, 1)
					assert.Equal(t, "/path/to/image.png", resp.Steps[0].MediaAssets[0].StoragePath)
				}
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, assert.AnError.Error())
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
