package guides_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	"github.com/CliqRelay/cliqrelay/tests"
	"github.com/CliqRelay/cliqrelay/types"
)

func TestGuidesService_CreateWithClientGuideID(t *testing.T) {
	t.Parallel()

	const actorID = "test-user-123"

	teamID := uuid.New()
	clientGuideID := uuid.New().String()
	title := "Recorded Guide"
	description := "Captured from the extension"
	metadata := map[string]any{"source": "extension"}

	request := func() *types.CreateGuideRequest {
		return &types.CreateGuideRequest{
			TeamID:        teamID,
			Title:         title,
			Description:   new(description),
			ClientGuideID: new(clientGuideID),
			Metadata:      metadata,
		}
	}

	matchingGuide := func() *models.Guide {
		return &models.Guide{
			ID:            uuid.New(),
			TeamID:        teamID,
			CreatorID:     new(actorID),
			Title:         title,
			Description:   new(description),
			ClientGuideID: new(clientGuideID),
			Status:        models.StatusDraft,
			Metadata:      metadata,
		}
	}

	cases := []struct {
		name      string
		setup     func(*tests.MockGuidesRepository)
		wantErrIs error
		wantGuide func(*testing.T, *models.Guide)
	}{
		{
			name: "replays the existing guide",
			setup: func(repo *tests.MockGuidesRepository) {
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(matchingGuide(), nil).
					Once()
			},
			wantGuide: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, title, guide.Title)
			},
		},
		{
			name: "conflicts when the payload changed",
			setup: func(repo *tests.MockGuidesRepository) {
				existing := matchingGuide()
				existing.Title = "Different title"
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(existing, nil).
					Once()
			},
			wantErrIs: constants.ErrClientIDConflict,
		},
		{
			name: "conflicts when the metadata changed",
			setup: func(repo *tests.MockGuidesRepository) {
				existing := matchingGuide()
				existing.Metadata = map[string]any{"source": "web"}
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(existing, nil).
					Once()
			},
			wantErrIs: constants.ErrClientIDConflict,
		},
		{
			name: "conflicts when the client id belongs to another user",
			setup: func(repo *tests.MockGuidesRepository) {
				existing := matchingGuide()
				existing.CreatorID = new("another-user")
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(existing, nil).
					Once()
			},
			wantErrIs: constants.ErrClientIDConflict,
		},
		{
			name: "returns the winner after losing the unique index race",
			setup: func(repo *tests.MockGuidesRepository) {
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(nil, nil).
					Once()
				repo.On("LockOrganizationForUpdate", mock.Anything, teamID).
					Return(nil).
					Once()
				repo.On("Create", mock.Anything, mock.Anything).
					Return(nil, constants.ErrDuplicateClientID).
					Once()
				repo.On("GetByClientID", mock.Anything, clientGuideID).
					Return(matchingGuide(), nil).
					Once()
			},
			wantGuide: func(t *testing.T, guide *models.Guide) {
				assert.Equal(t, title, guide.Title)
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := new(tests.MockGuidesRepository)
			tt.setup(repo)
			svc := guidesservice.NewGuidesService(repo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))
			actor := &authulamodels.Actor{ID: actorID}

			guide, err := svc.Create(context.Background(), actor, teamID.String(), request())

			if tt.wantErrIs != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tt.wantErrIs)
				assert.Nil(t, guide)
			} else {
				require.NoError(t, err)
				require.NotNil(t, guide)
				if tt.wantGuide != nil {
					tt.wantGuide(t, guide)
				}
			}

			repo.AssertExpectations(t)
		})
	}
}

func TestGuidesService_CreateWithClientGuideID_DeletedGuideReportsDeleted(t *testing.T) {
	t.Parallel()

	teamID := uuid.New()
	clientGuideID := uuid.New().String()
	repo := new(tests.MockGuidesRepository)
	repo.On("GetByClientID", mock.Anything, clientGuideID).
		Return(&models.Guide{
			ID:            uuid.New(),
			TeamID:        teamID,
			CreatorID:     new("test-user-123"),
			Title:         "Deleted guide",
			ClientGuideID: new(clientGuideID),
			DeletedAt:     new(time.Now()),
		}, nil).
		Once()
	svc := guidesservice.NewGuidesService(repo, nil, new(tests.MockStepsRepository), testRedisClient(), (*interfaces.GuideHooks)(nil))

	_, err := svc.Create(context.Background(), &authulamodels.Actor{ID: "test-user-123"}, teamID.String(), &types.CreateGuideRequest{
		TeamID:        teamID,
		Title:         "Deleted guide",
		ClientGuideID: new(clientGuideID),
	})

	require.Error(t, err)
	assert.ErrorIs(t, err, constants.ErrClientIDConflict)
	assert.ErrorIs(t, err, constants.ErrGuideDeleted)
	repo.AssertExpectations(t)
}
