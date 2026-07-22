package guides

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService struct {
	guidesRepo        interfaces.GuidesRepository
	starredGuidesRepo interfaces.StarredGuidesRepository
	guidesCache       interfaces.GuidesCacheService
	stepsRepo         interfaces.StepsRepository
	redisClient       *redis.Client
	hooks             *interfaces.GuideHooks
}

func NewGuidesService(
	guidesRepo interfaces.GuidesRepository,
	starredGuidesRepo interfaces.StarredGuidesRepository,
	guidesCache interfaces.GuidesCacheService,
	stepsRepo interfaces.StepsRepository,
	redisClient *redis.Client,
	hooks *interfaces.GuideHooks,
) *GuidesService {
	return &GuidesService{
		guidesRepo:        guidesRepo,
		starredGuidesRepo: starredGuidesRepo,
		guidesCache:       guidesCache,
		stepsRepo:         stepsRepo,
		redisClient:       redisClient,
		hooks:             hooks,
	}
}

func (s *GuidesService) Create(ctx context.Context, workspaceID string, req *types.CreateGuideRequest) (*models.Guide, error) {
	if s.hooks != nil && s.hooks.BeforeCreate != nil {
		if err := s.hooks.BeforeCreate(ctx, workspaceID, req); err != nil {
			return nil, err
		}
	}

	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return nil, constants.ErrWorkspaceNotFound
	}

	guideCreated, err := s.guidesRepo.Create(ctx, &types.CreateGuideDTO{
		WorkspaceID: parsedWSID,
		CreatorID:   req.WorkspaceID.String(),
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.AfterCreate != nil {
		if err := s.hooks.AfterCreate(ctx, guideCreated); err != nil {
			return nil, err
		}
	}

	return guideCreated, nil
}

func (s *GuidesService) CreateDemoGuide(ctx context.Context, workspaceID string) (string, error) {
	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return "", constants.ErrWorkspaceNotFound
	}

	guide, err := s.guidesRepo.Create(ctx, &types.CreateGuideDTO{
		WorkspaceID: parsedWSID,
		Title:       "Getting Started with CliqRelay",
		Description: new("A sample guide to show you how CliqRelay works"),
	})
	if err != nil {
		return "", err
	}

	guideID := guide.ID.String()
	clickAction := models.StepActionClick

	demoSteps := []*types.CreateStepDTO{
		{
			WorkspaceID:   parsedWSID,
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeHeader, HeadingText: new("Overview of CliqRelay"), BodyText: new("You can use this step to provide an overview or introduction to your guide.")},
		},
		{
			WorkspaceID: parsedWSID,
			GuideID:     guide.ID,
			Type:        models.StepTypeInteraction,
			Action:      &clickAction,
			ActionText:  new("Click \"Some Button\""),
			Notes:       new("This step demonstrates a click step which will be accompanied by a screenshot of the action."),
		},
		{
			WorkspaceID:   parsedWSID,
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeTip, HeadingText: new("This is a note"), BodyText: new("You can use this step to provide additional information or tips related to the guide.")},
		},
		{
			WorkspaceID:   parsedWSID,
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeCallout, HeadingText: new("Callout"), BodyText: new("This is a callout step, which can be used to draw attention to important information or warnings.")},
		},
		{
			WorkspaceID:   parsedWSID,
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeAlert, HeadingText: new("Alert"), BodyText: new("This is an alert step, which can be used to highlight critical information or errors that users should be aware of.")},
		},
	}

	for _, stepDTO := range demoSteps {
		if _, err := s.stepsRepo.Create(ctx, stepDTO); err != nil {
			return "", err
		}
	}

	return guideID, nil
}

func (s *GuidesService) GetAll(ctx context.Context, workspaceID string, status *string) ([]*models.Guide, error) {
	filter := &types.GuideFilter{}

	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return nil, constants.ErrWorkspaceNotFound
	}
	filter.WorkspaceID = &parsedWSID

	if status != nil {
		if !slices.Contains([]string{
			models.StatusDraft.ToString(),
			models.StatusPublished.ToString(),
			models.StatusArchived.ToString(),
			models.StatusDeleted.ToString(),
		}, *status) {
			return nil, fmt.Errorf("invalid status: %s", *status)
		}
		statusVal := models.GuideStatus(*status)
		filter.Status = &statusVal
	}

	return s.guidesRepo.GetAll(ctx, filter)
}

func (s *GuidesService) GetByID(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	if s.guidesCache != nil {
		cached, err := s.guidesCache.Get(ctx, guideID)
		if err == nil && cached != nil {
			if cached.Status == models.StatusDeleted {
				return nil, constants.ErrGuideNotFound
			}
			return cached, nil
		}
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if guide == nil || guide.Status == models.StatusDeleted {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Set(ctx, guide)
	}

	return guide, nil
}

func (s *GuidesService) Update(ctx context.Context, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return nil, constants.ErrInvalidGuideID
	}

	existing, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, existing); err != nil {
			return nil, err
		}
	}

	updated, err := s.guidesRepo.Update(ctx, &types.UpdateGuideDTO{
		ID:          parsedID,
		WorkspaceID: existing.WorkspaceID,
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterUpdate != nil {
		if err := s.hooks.AfterUpdate(ctx, updated); err != nil {
			return nil, err
		}
	}

	return updated, nil
}

func (s *GuidesService) Delete(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	existing, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, guideID); err != nil {
			return nil, err
		}
	}

	deleted, err := s.guidesRepo.Delete(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if deleted == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterDelete != nil {
		if err := s.hooks.AfterDelete(ctx, guideID); err != nil {
			return nil, err
		}
	}

	return deleted, nil
}

func (s *GuidesService) recalculateDuration(ctx context.Context, guideID string) error {
	if s.stepsRepo != nil {
		steps, err := s.stepsRepo.GetByGuideID(ctx, guideID)
		if err != nil {
			return err
		}

		duration := models.CalculateSyntheticDuration(steps)
		_, err = s.guidesRepo.UpdateDuration(ctx, guideID, duration)
		return err
	}
	return nil
}

func (s *GuidesService) Publish(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusDraft {
		return nil, fmt.Errorf("only guides in draft status can be published")
	}

	if s.hooks != nil && s.hooks.BeforePublish != nil {
		if err := s.hooks.BeforePublish(ctx, guide); err != nil {
			return nil, err
		}
	}

	if err := s.recalculateDuration(ctx, guideID); err != nil {
		return nil, err
	}

	published, err := s.guidesRepo.Publish(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if published == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterPublish != nil {
		if err := s.hooks.AfterPublish(ctx, published); err != nil {
			return nil, err
		}
	}

	return published, nil
}

func (s *GuidesService) Unpublish(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in published status can be unpublished")
	}

	if s.hooks != nil && s.hooks.BeforeUnpublish != nil {
		if err := s.hooks.BeforeUnpublish(ctx, guide); err != nil {
			return nil, err
		}
	}

	unpublished, err := s.guidesRepo.Unpublish(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if unpublished == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterUnpublish != nil {
		if err := s.hooks.AfterUnpublish(ctx, unpublished); err != nil {
			return nil, err
		}
	}

	return unpublished, nil
}

func (s *GuidesService) Archive(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusDraft && guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in draft or published status can be archived")
	}

	if s.hooks != nil && s.hooks.BeforeArchive != nil {
		if err := s.hooks.BeforeArchive(ctx, guide); err != nil {
			return nil, err
		}
	}

	archived, err := s.guidesRepo.Archive(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if archived == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterArchive != nil {
		if err := s.hooks.AfterArchive(ctx, archived); err != nil {
			return nil, err
		}
	}

	return archived, nil
}

func (s *GuidesService) Unarchive(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusArchived {
		return nil, fmt.Errorf("only guides in archived status can be unarchived")
	}

	if s.hooks != nil && s.hooks.BeforeUnarchive != nil {
		if err := s.hooks.BeforeUnarchive(ctx, guide); err != nil {
			return nil, err
		}
	}

	unarchived, err := s.guidesRepo.Unarchive(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if unarchived == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if s.hooks != nil && s.hooks.AfterUnarchive != nil {
		if err := s.hooks.AfterUnarchive(ctx, unarchived); err != nil {
			return nil, err
		}
	}

	return unarchived, nil
}

func (s *GuidesService) Restore(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	existing, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, constants.ErrGuideNotFound
	}

	restored, err := s.guidesRepo.Restore(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if restored == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	return restored, nil
}

func (s *GuidesService) GetCount(ctx context.Context, workspaceID string) (int, error) {
	filter := &types.GuideFilter{}

	parsedWSID, err := uuid.Parse(workspaceID)
	if err != nil {
		return 0, constants.ErrWorkspaceNotFound
	}
	filter.WorkspaceID = &parsedWSID

	count, err := s.guidesRepo.GetCount(ctx, filter)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *GuidesService) PermanentlyDelete(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	existing, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, constants.ErrGuideNotFound
	}

	deleted, err := s.guidesRepo.PermanentlyDelete(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if deleted == nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	if err := s.publishPurgeEvent(ctx, guideID); err != nil {
		slog.Error("failed to publish purge event", "guide_id", guideID, "err", err)
	}

	return deleted, nil
}

func (s *GuidesService) publishPurgeEvent(ctx context.Context, guideID string) error {
	return events.Publish(ctx, s.redisClient, events.TopicGuides, events.EventTypeGuidePurge, &events.GuidePurgePayload{
		GuideID: guideID,
	})
}

func (s *GuidesService) RecalculateDuration(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := s.recalculateDuration(ctx, guideID); err != nil {
		return nil, err
	}

	updated, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Invalidate(ctx, guideID)
	}

	return updated, nil
}
