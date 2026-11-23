package steps_test

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestStepsService_CreateWithClientStepID(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()
	clientStepID := uuid.New().String()

	request := func() *types.CreateStepRequest {
		return &types.CreateStepRequest{
			GuideID:           guideID,
			Type:              models.StepTypeInteraction,
			Action:            new(models.StepActionClick),
			ActionText:        new("Click Save"),
			URL:               new("https://example.test/settings"),
			InsertAfterStepID: new(uuid.New().String()),
			ClientStepID:      new(clientStepID),
		}
	}

	matchingStep := func() *models.Step {
		return &models.Step{
			ID:           uuid.New(),
			GuideID:      guideID,
			Type:         models.StepTypeInteraction,
			Action:       new(models.StepActionClick),
			ActionText:   new("Click Save"),
			URL:          new("https://example.test/settings"),
			ClientStepID: new(clientStepID),
			SortOrder:    "a0",
		}
	}

	cases := []struct {
		name      string
		setup     func(*tests.MockStepsRepository, *tests.MockGuidesRepository)
		wantErrIs error
		wantStep  func(*testing.T, *models.Step)
	}{
		{
			name: "replays the existing step ignoring the insert anchor",
			setup: func(stepsRepo *tests.MockStepsRepository, guidesRepo *tests.MockGuidesRepository) {
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{ID: guideID, Title: "Guide", Status: models.StatusDraft}, nil).
					Once()
				stepsRepo.On("GetByClientID", mock.Anything, clientStepID).
					Return(matchingStep(), nil).
					Once()
			},
			wantStep: func(t *testing.T, step *models.Step) {
				assert.Equal(t, models.StepActionClick, *step.Action)
			},
		},
		{
			name: "conflicts when the payload changed",
			setup: func(stepsRepo *tests.MockStepsRepository, guidesRepo *tests.MockGuidesRepository) {
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{ID: guideID, Title: "Guide", Status: models.StatusDraft}, nil).
					Once()
				existing := matchingStep()
				existing.ActionText = new("Click Cancel")
				stepsRepo.On("GetByClientID", mock.Anything, clientStepID).
					Return(existing, nil).
					Once()
			},
			wantErrIs: constants.ErrClientIDConflict,
		},
		{
			name: "conflicts when the client id belongs to another guide",
			setup: func(stepsRepo *tests.MockStepsRepository, guidesRepo *tests.MockGuidesRepository) {
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{ID: guideID, Title: "Guide", Status: models.StatusDraft}, nil).
					Once()
				existing := matchingStep()
				existing.GuideID = uuid.New()
				stepsRepo.On("GetByClientID", mock.Anything, clientStepID).
					Return(existing, nil).
					Once()
			},
			wantErrIs: constants.ErrClientIDConflict,
		},
		{
			name: "returns the winner after losing the unique index race",
			setup: func(stepsRepo *tests.MockStepsRepository, guidesRepo *tests.MockGuidesRepository) {
				guidesRepo.On("GetByID", mock.Anything, guideID.String()).
					Return(&models.Guide{ID: guideID, Title: "Guide", Status: models.StatusDraft}, nil).
					Once()
				stepsRepo.On("GetByClientID", mock.Anything, clientStepID).
					Return(nil, nil).
					Once()
				stepsRepo.On("Create", mock.Anything, mock.Anything).
					Return(nil, constants.ErrDuplicateClientID).
					Once()
				stepsRepo.On("GetByClientID", mock.Anything, clientStepID).
					Return(matchingStep(), nil).
					Once()
			},
			wantStep: func(t *testing.T, step *models.Step) {
				assert.Equal(t, guideID, step.GuideID)
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stepsRepo := new(tests.MockStepsRepository)
			guidesRepo := new(tests.MockGuidesRepository)
			tt.setup(stepsRepo, guidesRepo)
			logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
			svc := stepsservice.NewStepsService(
				testRedisClient(),
				stepsRepo,
				guidesRepo,
				new(tests.MockPresignService),
				new(tests.MockStorageService),
				new(tests.MockMediaAssetsRepository),
				"test-bucket",
				logger,
				(*interfaces.StepHooks)(nil),
			)

			step, err := svc.Create(context.Background(), request())

			if tt.wantErrIs != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tt.wantErrIs)
				assert.Nil(t, step)
			} else {
				require.NoError(t, err)
				require.NotNil(t, step)
				if tt.wantStep != nil {
					tt.wantStep(t, step)
				}
			}

			stepsRepo.AssertExpectations(t)
			guidesRepo.AssertExpectations(t)
		})
	}
}

func TestStepsService_CreateWithClientStepID_RejectsDeletedGuide(t *testing.T) {
	t.Parallel()

	guideID := uuid.New()
	stepsRepo := new(tests.MockStepsRepository)
	guidesRepo := new(tests.MockGuidesRepository)
	guidesRepo.On("GetByID", mock.Anything, guideID.String()).
		Return(&models.Guide{
			ID:        guideID,
			Title:     "Deleted guide",
			Status:    models.StatusDeleted,
			DeletedAt: new(time.Now()),
		}, nil).
		Once()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	svc := stepsservice.NewStepsService(
		testRedisClient(),
		stepsRepo,
		guidesRepo,
		new(tests.MockPresignService),
		new(tests.MockStorageService),
		new(tests.MockMediaAssetsRepository),
		"test-bucket",
		logger,
		(*interfaces.StepHooks)(nil),
	)

	step, err := svc.Create(context.Background(), &types.CreateStepRequest{
		GuideID:      guideID,
		Type:         models.StepTypeInteraction,
		Action:       new(models.StepActionClick),
		ClientStepID: new(uuid.New().String()),
	})

	require.Error(t, err)
	assert.ErrorIs(t, err, constants.ErrGuideDeleted)
	assert.Nil(t, step)
	stepsRepo.AssertExpectations(t)
	guidesRepo.AssertExpectations(t)
}
