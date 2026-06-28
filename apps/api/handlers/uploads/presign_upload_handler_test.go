package uploads_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/config"
	handlersuploads "github.com/CliqRelay/cliqrelay/handlers/uploads"
	"github.com/CliqRelay/cliqrelay/models"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestPresignUploadHandler(t *testing.T) {
	t.Parallel()

	appConfig := &config.AppConfig{}
	stepAction := models.StepActionClick
	guideID := uuid.New()
	stepID := uuid.New()
	otherGuideID := uuid.New()

	cases := []struct {
		name           string
		payload        any
		setup          func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService)
		expectedStatus int
	}{
		{
			name: "success",
			payload: types.PresignUploadRequest{
				GuideID: guideID.String(),
				StepID:  stepID.String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignService *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockPresignService.On("PutURL", mock.Anything, "test-bucket", mock.AnythingOfType("string"), "image/webp").
					Return("https://storage.example.com/presigned-url", nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "missing guideId",
			payload: types.PresignUploadRequest{
				GuideID: "",
				StepID:  uuid.New().String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "invalid guideId",
			payload: types.PresignUploadRequest{
				GuideID: "not-a-uuid",
				StepID:  uuid.New().String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "missing stepId",
			payload: types.PresignUploadRequest{
				GuideID: uuid.New().String(),
				StepID:  "",
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "guide not found",
			payload: types.PresignUploadRequest{
				GuideID: guideID.String(),
				StepID:  uuid.New().String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(nil, nil).
					Once()
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "step not found",
			payload: types.PresignUploadRequest{
				GuideID: guideID.String(),
				StepID:  stepID.String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(nil, nil).
					Once()
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "step not in guide",
			payload: types.PresignUploadRequest{
				GuideID: guideID.String(),
				StepID:  stepID.String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: "test-user-123",
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   otherGuideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "service error",
			payload: types.PresignUploadRequest{
				GuideID: guideID.String(),
				StepID:  uuid.New().String(),
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository, mockPresignClient *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockPresignClient := new(tests.MockPresignService)
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient)
			mockIdentity := new(tests.MockIdentityService)
			mockAuthz := new(tests.MockAuthorizationService)
			mockIdentity.On("Current", mock.Anything).Return(&models.Identity{ID: "test-user-123", Kind: models.IdentityTypeUser})
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything).Return(nil)
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, mockIdentity, mockAuthz, "test-bucket")
			handler := handlersuploads.NewPresignUploadHandler(appConfig, svc)

			path := "/api/v1/uploads/presign"
			req := tests.NewHandlerRequest(t, http.MethodPost, path, tt.payload)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.PresignUploadResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, "https://storage.example.com/presigned-url", resp.PresignedURL)
				assert.Contains(t, resp.StoragePath, "uploads/guides/")
			}

			mockGuidesRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}
