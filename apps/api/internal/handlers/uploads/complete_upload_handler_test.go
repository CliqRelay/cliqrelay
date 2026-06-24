package uploads_test

import (
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/internal"
	handlersuploads "github.com/CliqRelay/cliqrelay/internal/handlers/uploads"
	"github.com/CliqRelay/cliqrelay/internal/models"
	uploadsservice "github.com/CliqRelay/cliqrelay/internal/services/uploads"
	"github.com/CliqRelay/cliqrelay/internal/tests"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

func TestCompleteUploadHandler(t *testing.T) {
	t.Parallel()

	appConfig := &internal.AppConfig{}
	stepAction := models.StepActionClick
	guideID := uuid.New()
	stepID := uuid.New()
	otherGuideID := uuid.New()
	creatorUserID := "test-user-123"
	storagePath := "uploads/guides/abc/steps/def/123"
	fileSize := 1024
	mimeType := "image/png"

	cases := []struct {
		name           string
		payload        any
		setup          func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository)
		presignSetup   func(*tests.MockPresignService)
		expectedStatus int
	}{
		{
			name: "success",
			payload: types.CompleteUploadRequest{
				StepID:      stepID.String(),
				StoragePath: storagePath,
				FileSize:    &fileSize,
				MimeType:    &mimeType,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   guideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, creatorUserID, guideID.String()).
					Return(&models.Guide{
						ID:        guideID,
						CreatorID: creatorUserID,
						Title:     "Test Guide",
						Status:    models.StatusDraft,
					}, nil).
					Once()
				mockMediaAssetsRepo.On("Create", mock.Anything, mock.AnythingOfType("*types.CreateMediaAssetDTO")).
					Return(&models.MediaAsset{
						ID:          uuid.New(),
						StepID:      stepID,
						StoragePath: storagePath,
						MimeType:    &mimeType,
						ByteSize:    &fileSize,
					}, nil).
					Once()
			},
			presignSetup: func(mockPresignService *tests.MockPresignService) {
				mockPresignService.On("GetURL", mock.Anything, "test-bucket", storagePath).
					Return("https://test-bucket.s3.amazonaws.com/"+storagePath, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "missing stepId",
			payload: types.CompleteUploadRequest{
				StepID:      "",
				StoragePath: storagePath,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
			},
			presignSetup:   nil,
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "missing storagePath",
			payload: types.CompleteUploadRequest{
				StepID:      uuid.New().String(),
				StoragePath: "",
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
			},
			presignSetup:   nil,
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "invalid stepId",
			payload: types.CompleteUploadRequest{
				StepID:      "not-a-uuid",
				StoragePath: storagePath,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
			},
			presignSetup:   nil,
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name: "step not found",
			payload: types.CompleteUploadRequest{
				StepID:      uuid.New().String(),
				StoragePath: storagePath,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, nil).
					Once()
			},
			presignSetup:   nil,
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "step not in user's guide",
			payload: types.CompleteUploadRequest{
				StepID:      stepID.String(),
				StoragePath: storagePath,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{
						ID:        stepID,
						GuideID:   otherGuideID,
						SortOrder: "a0",
						Action:    &stepAction,
					}, nil).
					Once()
				mockGuidesRepo.On("GetByID", mock.Anything, creatorUserID, otherGuideID.String()).
					Return(nil, nil).
					Once()
			},
			presignSetup:   nil,
			expectedStatus: http.StatusNotFound,
		},
		{
			name: "service error",
			payload: types.CompleteUploadRequest{
				StepID:      uuid.New().String(),
				StoragePath: storagePath,
			},
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, mockMediaAssetsRepo *tests.MockMediaAssetsRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, mock.AnythingOfType("string")).
					Return(nil, assert.AnError).
					Once()
			},
			presignSetup:   nil,
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
			tt.setup(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo)
			if tt.presignSetup != nil {
				tt.presignSetup(mockPresignClient)
			}
			svc := uploadsservice.NewUploadsService(mockGuidesRepo, mockStepsRepo, mockMediaAssetsRepo, mockPresignClient, "test-bucket")
			handler := handlersuploads.NewCompleteUploadHandler(appConfig, svc)

			path := "/api/v1/uploads/complete"
			req := tests.NewHandlerRequest(t, http.MethodPost, path, tt.payload)

			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.CompleteUploadResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, storagePath, resp.StoragePath)
				assert.Contains(t, resp.URL, "https://")
				assert.Contains(t, resp.URL, "test-bucket")
				assert.Contains(t, resp.URL, storagePath)
			}

			mockGuidesRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
			mockMediaAssetsRepo.AssertExpectations(t)
			mockPresignClient.AssertExpectations(t)
		})
	}
}
