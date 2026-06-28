package guides

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	authulamodels "github.com/Authula/authula/models"
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
	authzService      interfaces.AuthorizationService
	hooks             *interfaces.GuideHooks
}

func NewGuidesService(
	guidesRepo interfaces.GuidesRepository,
	starredGuidesRepo interfaces.StarredGuidesRepository,
	guidesCache interfaces.GuidesCacheService,
	stepsRepo interfaces.StepsRepository,
	redisClient *redis.Client,
	authzService interfaces.AuthorizationService,
	hooks *interfaces.GuideHooks,
) *GuidesService {
	return &GuidesService{
		guidesRepo:        guidesRepo,
		starredGuidesRepo: starredGuidesRepo,
		guidesCache:       guidesCache,
		stepsRepo:         stepsRepo,
		redisClient:       redisClient,
		authzService:      authzService,
		hooks:             hooks,
	}
}

func (s *GuidesService) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateGuideRequest) (*models.Guide, error) {
	if err := s.authzService.CanCreateGuide(ctx, actor); err != nil {
		return nil, err
	}

	userID := actor.ID
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if s.hooks != nil && s.hooks.BeforeCreate != nil {
		if err := s.hooks.BeforeCreate(ctx, actor, req); err != nil {
			return nil, err
		}
	}

	guideCreated, err := s.guidesRepo.Create(ctx, &types.CreateGuideDTO{
		CreatorID:   userID,
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	if s.hooks != nil && s.hooks.AfterCreate != nil {
		if err := s.hooks.AfterCreate(ctx, actor, guideCreated); err != nil {
			return nil, err
		}
	}

	return guideCreated, nil
}

func (s *GuidesService) GetAll(ctx context.Context, actor *authulamodels.Actor, status *string) ([]*models.Guide, error) {
	filter, err := s.authzService.GuideListFilter(ctx, actor)
	if err != nil {
		return nil, err
	}

	if status == nil {
		rows, err := s.starredGuidesRepo.GetAll(ctx, filter)
		if err != nil {
			return nil, err
		}
		guides := make([]*models.Guide, len(rows))
		for i, row := range rows {
			guides[i] = &row.Guide
			guides[i].IsStarred = row.IsStarred
		}
		return guides, nil
	}

	if slices.Contains([]string{
		models.StatusDraft.ToString(),
		models.StatusPublished.ToString(),
		models.StatusArchived.ToString(),
		models.StatusDeleted.ToString(),
	}, *status) == false {
		return nil, fmt.Errorf("invalid status: %s", *status)
	}

	statusVal := models.GuideStatus(*status)
	clonedFilter := *filter
	clonedFilter.Status = &statusVal

	rows, err := s.starredGuidesRepo.GetAll(ctx, &clonedFilter)
	if err != nil {
		return nil, err
	}
	guides := make([]*models.Guide, len(rows))
	for i, row := range rows {
		guides[i] = &row.Guide
		guides[i].IsStarred = row.IsStarred
	}
	return guides, nil
}

func (s *GuidesService) GetByID(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	if s.guidesCache != nil {
		cached, err := s.guidesCache.Get(ctx, guideID)
		if err == nil && cached != nil {
			if cached.Status == models.StatusDeleted {
				return nil, constants.ErrGuideNotFound
			}

			if err := s.authzService.CanReadGuide(ctx, actor, cached); err == nil {
				return cached, nil
			}
		}
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if guide == nil || guide.Status == models.StatusDeleted {
		return nil, constants.ErrGuideNotFound
	}

	if err := s.authzService.CanReadGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.guidesCache != nil {
		_ = s.guidesCache.Set(ctx, guide)
	}

	return guide, nil
}

func (s *GuidesService) Update(ctx context.Context, actor *authulamodels.Actor, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, existing); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeUpdate != nil {
		if err := s.hooks.BeforeUpdate(ctx, actor, existing); err != nil {
			return nil, err
		}
	}

	updated, err := s.guidesRepo.Update(ctx, &types.UpdateGuideDTO{
		ID:          parsedID,
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
		if err := s.hooks.AfterUpdate(ctx, actor, updated); err != nil {
			return nil, err
		}
	}

	return updated, nil
}

func (s *GuidesService) Delete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanDeleteGuide(ctx, actor, existing); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if s.hooks != nil && s.hooks.BeforeDelete != nil {
		if err := s.hooks.BeforeDelete(ctx, actor, guideID); err != nil {
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
		if err := s.hooks.AfterDelete(ctx, actor, guideID); err != nil {
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

func (s *GuidesService) Publish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusDraft {
		return nil, fmt.Errorf("only guides in draft status can be published")
	}

	if s.hooks != nil && s.hooks.BeforePublish != nil {
		if err := s.hooks.BeforePublish(ctx, actor, guide); err != nil {
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
		if err := s.hooks.AfterPublish(ctx, actor, published); err != nil {
			return nil, err
		}
	}

	return published, nil
}

func (s *GuidesService) Unpublish(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in published status can be unpublished")
	}

	if s.hooks != nil && s.hooks.BeforeUnpublish != nil {
		if err := s.hooks.BeforeUnpublish(ctx, actor, guide); err != nil {
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
		if err := s.hooks.AfterUnpublish(ctx, actor, unpublished); err != nil {
			return nil, err
		}
	}

	return unpublished, nil
}

func (s *GuidesService) Archive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusDraft && guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in draft or published status can be archived")
	}

	if s.hooks != nil && s.hooks.BeforeArchive != nil {
		if err := s.hooks.BeforeArchive(ctx, actor, guide); err != nil {
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
		if err := s.hooks.AfterArchive(ctx, actor, archived); err != nil {
			return nil, err
		}
	}

	return archived, nil
}

func (s *GuidesService) Unarchive(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
		return nil, constants.ErrGuideNotFound
	}

	if guide.Status != models.StatusArchived {
		return nil, fmt.Errorf("only guides in archived status can be unarchived")
	}

	if s.hooks != nil && s.hooks.BeforeUnarchive != nil {
		if err := s.hooks.BeforeUnarchive(ctx, actor, guide); err != nil {
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
		if err := s.hooks.AfterUnarchive(ctx, actor, unarchived); err != nil {
			return nil, err
		}
	}

	return unarchived, nil
}

func (s *GuidesService) Restore(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, existing); err != nil {
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

func (s *GuidesService) GetCount(ctx context.Context, actor *authulamodels.Actor) (int, error) {
	filter, err := s.authzService.GuideListFilter(ctx, actor)
	if err != nil {
		return 0, err
	}

	count, err := s.guidesRepo.GetCount(ctx, filter)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *GuidesService) PermanentlyDelete(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanDeleteGuide(ctx, actor, existing); err != nil {
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

func (s *GuidesService) RecalculateDuration(ctx context.Context, actor *authulamodels.Actor, guideID string) (*models.Guide, error) {
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

	if err := s.authzService.CanEditGuide(ctx, actor, guide); err != nil {
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
