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

	"github.com/CliqRelay/cliqrelay/constants"
	handlerssteps "github.com/CliqRelay/cliqrelay/handlers/steps"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
	"github.com/CliqRelay/cliqrelay/usecases"
)

func TestGetAllStepsHandler(t *testing.T) {
	t.Parallel()

	testGuide := func() *models.Guide {
		return &models.Guide{
			ID:        uuid.New(),
			CreatorID: new("test-user-123"),
			Title:     "Test Guide",
			Status:    models.StatusDraft,
		}
	}

	expectGuide := func(mockGuidesRepo *tests.MockGuidesRepository) {
		mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).Return(testGuide(), nil).Once()
	}

	listParams := func(match func(*types.ListStepsParams) bool) any {
		return mock.MatchedBy(func(params *types.ListStepsParams) bool { return match(params) })
	}

	anyParams := listParams(func(*types.ListStepsParams) bool { return true })

	cases := []struct {
		name               string
		query              string
		setup              func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService)
		expectedStatus     int
		expectedLen        int
		expectedTotal      int
		expectedNextCursor *string
		expectedMessage    string
	}{
		{
			name:  "success",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, anyParams).
					Return(&types.StepsPage{
						Steps: []*models.Step{
							{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0", Action: new(models.StepActionClick)},
							{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "b0", Action: new(models.StepActionInput)},
						},
						Total: 2,
					}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    2,
			expectedTotal:  2,
		},
		{
			name:  "empty list",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, anyParams).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    0,
			expectedTotal:  0,
		},
		{
			name:  "returns steps with media assets",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, mockPresignClient *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, anyParams).
					Return(&types.StepsPage{
						Steps: []*models.Step{
							{
								ID:        uuid.New(),
								GuideID:   uuid.New(),
								SortOrder: "a0",
								Action:    new(models.StepActionClick),
								MediaAssets: []*models.MediaAsset{
									{ID: uuid.New(), StepID: uuid.New(), StoragePath: "/path/to/image.png"},
								},
							},
						},
						Total: 1,
					}, nil).
					Once()
				mockPresignClient.On("GetURL", mock.Anything, "test-bucket", "/path/to/image.png").
					Return("https://presigned.test/asset", nil).
					Once()
			},
			expectedStatus: http.StatusOK,
			expectedLen:    1,
			expectedTotal:  1,
		},
		{
			name:  "returns next_cursor and total when more pages exist",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, anyParams).
					Return(&types.StepsPage{
						Steps:      []*models.Step{{ID: uuid.New(), SortOrder: "a0"}},
						NextCursor: new("a0"),
						Total:      45,
					}, nil).
					Once()
			},
			expectedStatus:     http.StatusOK,
			expectedLen:        1,
			expectedTotal:      45,
			expectedNextCursor: new("a0"),
		},
		{
			name:  "defaults limit to 20 and cursor to nil when omitted",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, listParams(func(p *types.ListStepsParams) bool {
					return p.Limit == 20 && p.Cursor == nil
				})).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "clamps limit to 100",
			query: "?guide_id=" + uuid.New().String() + "&limit=500",
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, listParams(func(p *types.ListStepsParams) bool {
					return p.Limit == 100
				})).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "falls back to default limit for non-positive values",
			query: "?guide_id=" + uuid.New().String() + "&limit=0",
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, listParams(func(p *types.ListStepsParams) bool {
					return p.Limit == 20
				})).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "falls back to default limit for non-numeric values",
			query: "?guide_id=" + uuid.New().String() + "&limit=abc",
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, listParams(func(p *types.ListStepsParams) bool {
					return p.Limit == 20
				})).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:  "forwards cursor and guide id",
			query: "?guide_id=11111111-1111-1111-1111-111111111111&cursor=a0V&limit=5",
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, listParams(func(p *types.ListStepsParams) bool {
					return p.GuideID == "11111111-1111-1111-1111-111111111111" &&
						p.Cursor != nil && *p.Cursor == "a0V" &&
						p.Limit == 5
				})).
					Return(&types.StepsPage{Steps: []*models.Step{}}, nil).
					Once()
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:            "returns 422 when guide_id is missing",
			query:           "",
			setup:           func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService) {},
			expectedStatus:  http.StatusUnprocessableEntity,
			expectedMessage: "GuideID",
		},
		{
			name:            "returns 422 when guide_id is not a uuid",
			query:           "?guide_id=not-a-uuid",
			setup:           func(*tests.MockStepsRepository, *tests.MockGuidesRepository, *tests.MockPresignService) {},
			expectedStatus:  http.StatusUnprocessableEntity,
			expectedMessage: "GuideID",
		},
		{
			name:  "returns 404 when the guide does not exist",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).Return(nil, nil).Once()
			},
			expectedStatus:  http.StatusNotFound,
			expectedMessage: constants.ErrGuideNotFound.Error(),
		},
		{
			name:  "service error from guidesRepo.GetByID",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus:  http.StatusInternalServerError,
			expectedMessage: assert.AnError.Error(),
		},
		{
			name:  "service error from stepsRepo.ListByGuideID",
			query: "?guide_id=" + uuid.New().String(),
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockPresignService) {
				expectGuide(mockGuidesRepo)
				mockStepsRepo.On("ListByGuideID", mock.Anything, anyParams).
					Return(nil, assert.AnError).
					Once()
			},
			expectedStatus:  http.StatusInternalServerError,
			expectedMessage: assert.AnError.Error(),
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
			mockAuthz := new(tests.MockAuthorizationService)
			mockAuthz.On("CanReadGuide", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, mockPresignClient, new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger, (*interfaces.StepHooks)(nil))
			guidesSvc := guidesservice.NewGuidesService(mockGuidesRepo, nil, nil, nil, nil)
			uc := usecases.NewStepsUseCase(mockAuthz, svc, guidesSvc)
			handler := handlerssteps.NewGetAllStepsHandler(uc)

			req := tests.NewHandlerRequest(t, http.MethodGet, "/api/v1/steps"+tt.query, nil)
			handler.Handle()(req.W, req.Req)

			tests.AssertResponseStatus(t, req.ReqCtx, tt.expectedStatus)

			if tt.expectedStatus == http.StatusOK {
				var resp types.GetAllStepsResponse
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Len(t, resp.Steps, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, resp.Total)
				assert.Equal(t, tt.expectedNextCursor, resp.NextCursor)
				if tt.name == "returns steps with media assets" {
					require.Len(t, resp.Steps[0].MediaAssets, 1)
					assert.Equal(t, "/path/to/image.png", resp.Steps[0].MediaAssets[0].StoragePath)
				}
			} else if tt.expectedStatus == http.StatusUnprocessableEntity {
				var resp map[string]string
				tests.DecodeResponsePayload(t, req.ReqCtx, &resp)
				assert.Contains(t, resp["message"], tt.expectedMessage)
			} else {
				tests.AssertResponseMessage(t, req.ReqCtx, tt.expectedMessage)
			}

			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
