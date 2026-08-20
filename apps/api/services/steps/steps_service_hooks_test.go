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

func TestStepsService_Create_Hooks(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		setup   func(*tests.MockGuidesRepository, *tests.MockStepsRepository, *interfaces.StepHooks)
		wantErr bool
	}{
		{
			name: "runs registered before create hook and creates the step",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, mockStepsRepo *tests.MockStepsRepository, hooks *interfaces.StepHooks) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide", Status: models.StatusDraft}, nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *types.CreateStepRequest) error {
					return nil
				})
				mockStepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Step{ID: uuid.New(), GuideID: uuid.New(), SortOrder: "a0"}, nil).
					Once()
			},
		},
		{
			name: "returns before create hook error",
			setup: func(mockGuidesRepo *tests.MockGuidesRepository, _ *tests.MockStepsRepository, hooks *interfaces.StepHooks) {
				mockGuidesRepo.On("GetByID", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide", Status: models.StatusDraft}, nil).
					Once()
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *types.CreateStepRequest) error {
					return assert.AnError
				})
			},
			wantErr: true,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			mockGuidesRepo := new(tests.MockGuidesRepository)
			mockStepsRepo := new(tests.MockStepsRepository)
			hooks := &interfaces.StepHooks{}
			tt.setup(mockGuidesRepo, mockStepsRepo, hooks)
			tests.StubGuideDurationRecalculation(mockStepsRepo, mockGuidesRepo)
			svc := stepsservice.NewStepsService(testRedisClient(), mockStepsRepo, mockGuidesRepo, new(tests.MockPresignService), new(tests.MockStorageService), new(tests.MockMediaAssetsRepository), "test-bucket", logger, hooks)

			// Act
			step, err := svc.Create(context.Background(), &types.CreateStepRequest{GuideID: uuid.New()})

			// Assert
			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Nil(t, step)
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
			}
			mockGuidesRepo.AssertExpectations(t)
			mockStepsRepo.AssertExpectations(t)
		})
	}
}
