package guides_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

const hookTestTeamID = "00000000-0000-0000-0000-000000000001"

func TestGuidesService_Create_Hooks(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name                string
		setup               func(*tests.MockGuidesRepository, *interfaces.GuideHooks, *[]int)
		wantErr             bool
		wantOrder           []int
		wantCreateNotCalled bool
	}{
		{
			name: "runs multiple after create hooks in registration order",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, calls *[]int) {
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide"}, nil).
					Once()
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 1)
					return nil
				})
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
					*calls = append(*calls, 2)
					return nil
				})
			},
			wantOrder: []int{1, 2},
		},
		{
			name: "returns before create hook error without creating the guide",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				hooks.RegisterBeforeCreate(func(_ context.Context, _ *authulamodels.Actor, _ string, _ *types.CreateGuideRequest) error {
					return assert.AnError
				})
			},
			wantErr:             true,
			wantCreateNotCalled: true,
		},
		{
			name: "returns after create hook error",
			setup: func(mockRepo *tests.MockGuidesRepository, hooks *interfaces.GuideHooks, _ *[]int) {
				mockRepo.On("Create", mock.Anything, mock.Anything).
					Return(&models.Guide{ID: uuid.New(), Title: "Test Guide"}, nil).
					Once()
				hooks.RegisterAfterCreate(func(_ context.Context, _ *authulamodels.Actor, _ *models.Guide) error {
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
			var calls []int
			mockRepo := new(tests.MockGuidesRepository)
			hooks := &interfaces.GuideHooks{}
			tt.setup(mockRepo, hooks, &calls)
			svc := guidesservice.NewGuidesService(mockRepo, nil, new(tests.MockStepsRepository), testRedisClient(), hooks)

			// Act
			guide, err := svc.Create(context.Background(), &authulamodels.Actor{ID: "user-1"}, hookTestTeamID, &types.CreateGuideRequest{Title: "Test Guide"})

			// Assert
			if tt.wantErr {
				assert.ErrorIs(t, err, assert.AnError)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				assert.Equal(t, tt.wantOrder, calls)
			}
			if tt.wantCreateNotCalled {
				mockRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}
