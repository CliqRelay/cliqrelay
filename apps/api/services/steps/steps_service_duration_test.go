package steps_test

import (
	"context"
	"log/slog"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestStepsService_RecalculatesGuideDuration(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()
	stepID := uuid.New()

	guideSteps := []*models.Step{
		{ID: uuid.New(), GuideID: guideID, Action: new(models.StepActionClick), ActionText: new("Click the save button")},
		{ID: uuid.New(), GuideID: guideID, Action: new(models.StepActionInput), ActionText: new("Type your email address")},
	}
	expectedDuration := models.CalculateSyntheticDuration(guideSteps)

	cases := []struct {
		name        string
		setup       func(*tests.MockStepsRepository, *tests.MockGuidesRepository)
		act         func(*stepsservice.StepsService) error
		wantRecalcs int
	}{
		{
			name: "create recalculates",
			setup: func(mockStepsRepo *tests.MockStepsRepository, mockGuidesRepo *tests.MockGuidesRepository) {
				mockGuidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{ID: guideID, Status: models.StatusDraft}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0"}, nil).
					Once()
			},
			act: func(svc *stepsservice.StepsService) error {
				_, err := svc.Create(context.Background(), &types.CreateStepRequest{GuideID: guideID})
				return err
			},
			wantRecalcs: 1,
		},
		{
			name: "update recalculates",
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0"}, nil).
					Once()
				mockStepsRepo.On("Update", mock.Anything, mock.Anything).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0"}, nil).
					Once()
			},
			act: func(svc *stepsservice.StepsService) error {
				_, err := svc.Update(context.Background(), stepID.String(), &types.UpdateStepRequest{})
				return err
			},
			wantRecalcs: 1,
		},
		{
			name: "delete recalculates",
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0"}, nil).
					Once()
				mockStepsRepo.On("Delete", mock.Anything, stepID.String()).
					Return(nil).
					Once()
			},
			act: func(svc *stepsservice.StepsService) error {
				return svc.Delete(context.Background(), stepID.String())
			},
			wantRecalcs: 1,
		},
		{
			name: "duplicate recalculates",
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				duplicateID := uuid.New()
				mockStepsRepo.On("GetByID", mock.Anything, stepID.String()).
					Return(&models.Step{ID: stepID, GuideID: guideID, SortOrder: "a0"}, nil).
					Once()
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{ID: duplicateID, GuideID: guideID, SortOrder: "a1"}, nil).
					Once()
				mockStepsRepo.On("GetByID", mock.Anything, duplicateID.String()).
					Return(&models.Step{ID: duplicateID, GuideID: guideID, SortOrder: "a1"}, nil).
					Once()
			},
			act: func(svc *stepsservice.StepsService) error {
				_, err := svc.Duplicate(context.Background(), stepID.String(), &types.DuplicateStepRequest{})
				return err
			},
			wantRecalcs: 1,
		},
		{
			name: "reorder does not recalculate",
			setup: func(mockStepsRepo *tests.MockStepsRepository, _ *tests.MockGuidesRepository) {
				mockStepsRepo.On("Reorder", mock.Anything, guideID.String(), stepID.String(), mock.Anything, mock.Anything).
					Return(guideSteps, nil).
					Once()
			},
			act: func(svc *stepsservice.StepsService) error {
				_, err := svc.Reorder(context.Background(), guideID.String(), stepID.String(), nil, nil)
				return err
			},
			wantRecalcs: 0,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockStepsRepo := new(tests.MockStepsRepository)
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockMediaAssetsRepo := new(tests.MockMediaAssetsRepository)
			mockMediaAssetsRepo.On("GetByStepID", mock.Anything, mock.Anything).
				Return([]*models.MediaAsset{}, nil).
				Maybe()
			tt.setup(mockStepsRepo, mockGuidesRepo)

			recalcs := 0
			mockStepsRepo.On("GetByGuideID", mock.Anything, guideID.String()).
				Return(guideSteps, nil).
				Maybe()
			mockGuidesRepo.On("UpdateDuration", mock.Anything, guideID.String(), expectedDuration).
				Run(func(mock.Arguments) { recalcs++ }).
				Return(&models.Guide{ID: guideID, DurationSeconds: expectedDuration}, nil).
				Maybe()

			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), mockMediaAssetsRepo, "test-bucket", logger, (*interfaces.StepHooks)(nil))

			// Act
			err := tt.act(svc)

			// Assert
			require.NoError(t, err)
			assert.Equal(t, tt.wantRecalcs, recalcs)
			mockStepsRepo.AssertExpectations(t)
			mockGuidesRepo.AssertExpectations(t)
		})
	}
}
