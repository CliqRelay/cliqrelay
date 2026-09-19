package uploads_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/CliqRelay/cliqrelay/constants"
	handlersuploads "github.com/CliqRelay/cliqrelay/handlers/uploads"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestReplaceUploadHandler(t *testing.T) {
	t.Parallel()
	stepAction := models.StepActionClick
	guideID := uuid.New()
	stepID := uuid.New()
	creatorUserID := "test-user-123"
	storagePath := fmt.Sprintf("uploads/guides/%s/steps/%s/200.webp", guideID, stepID)
	oldPath := fmt.Sprintf("uploads/guides/%s/steps/%s/100.webp", guideID, stepID)
	mimeType := "image/webp"

	step := &models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0", Action: &stepAction}
	guide := &models.Guide{ID: guideID, CreatorID: new(creatorUserID), Title: "Test Guide", Status: models.StatusDraft}

	cases := []struct {
		name           string
		payload        any
		setup          func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService)
		authzErr       error
		expectedStatus int
	}{
		{
			name:    "success",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: storagePath, MimeType: &mimeType},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step, nil).Twice()
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
				mediaRepo.On("DeleteByStepID", mock.Anything, stepID.String()).
					Return([]*models.MediaAsset{{ID: uuid.New(), StepID: stepID, StoragePath: oldPath}}, nil).Once()
				mediaRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.MediaAsset{ID: uuid.New(), StepID: stepID, StoragePath: storagePath, MimeType: &mimeType}, nil).Once()
				presign.On("GetURL", mock.Anything, "test-bucket", storagePath).Return("https://test-bucket.s3.amazonaws.com/"+storagePath, nil).Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:    "header canvas step does not support media",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: storagePath, MimeType: &mimeType},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0", Type: models.StepTypeCanvas, CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeHeader}}, nil).Once()
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "missing step id",
			payload: types.ReplaceUploadRequest{StepID: "", StoragePath: storagePath},
			setup: func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:    "missing storage path",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: ""},
			setup: func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *tests.MockMediaAssetsRepository, *tests.MockPresignService) {
			},
			expectedStatus: http.StatusUnprocessableEntity,
		},
		{
			name:    "step not found",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: storagePath},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(nil, nil).Once()
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:    "storage path outside step prefix",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: "uploads/guides/other/steps/other/1.webp"},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step, nil).Twice()
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:    "edit denied",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: storagePath},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(step, nil).Once()
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).Return(guide, nil).Once()
			},
			authzErr:       constants.ErrGuideEditDenied,
			expectedStatus: http.StatusForbidden,
		},
		{
			name:    "repository error",
			payload: types.ReplaceUploadRequest{StepID: stepID.String(), StoragePath: storagePath},
			setup: func(guidesRepo *tests.MockGuidesRepository, stepsRepo *tests.MockStepsRepository, mediaRepo *tests.MockMediaAssetsRepository, presign *tests.MockPresignService) {
				stepsRepo.On("GetByID", mock.Anything, stepID.String()).Return(nil, assert.AnError).Once()
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			guidesRepo := new(tests.MockGuidesRepository)
			stepsRepo := new(tests.MockStepsRepository)
			mediaRepo := new(tests.MockMediaAssetsRepository)
			presign := new(tests.MockPresignService)
			tt.setup(guidesRepo, stepsRepo, mediaRepo, presign)
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanEditGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(tt.authzErr)

			svc := uploadsservice.NewUploadsService(guidesRepo, stepsRepo, mediaRepo, presign, tests.NewTestRedisClient(t), nil, "test-bucket")
			stepsSvc := stepsservice.NewStepsService(nil, stepsRepo, guidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", nil, (*interfaces.StepHooks)(nil))
			guidesSvc := guidesservice.NewGuidesService(guidesRepo, nil, nil, nil, nil)
			uc := usecases.NewUploadsUseCase(mockAuthz, svc, guidesSvc, stepsSvc)
			handler := handlersuploads.NewReplaceUploadHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodPost, "/api/v1/uploads/replace", tt.payload)
			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.ReplaceUploadResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Equal(t, storagePath, resp.StoragePath)
				assert.Contains(t, resp.URL, storagePath)
				assert.NotNil(t, resp.MediaAsset)
				assert.Equal(t, storagePath, resp.MediaAsset.StoragePath)
			}

			guidesRepo.AssertExpectations(t)
			stepsRepo.AssertExpectations(t)
			mediaRepo.AssertExpectations(t)
			presign.AssertExpectations(t)
		})
	}
}
