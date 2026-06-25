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
}

func NewGuidesService(guidesRepo interfaces.GuidesRepository, starredGuidesRepo interfaces.StarredGuidesRepository, guidesCache interfaces.GuidesCacheService, stepsRepo interfaces.StepsRepository, redisClient *redis.Client) *GuidesService {
	return &GuidesService{
		guidesRepo:        guidesRepo,
		starredGuidesRepo: starredGuidesRepo,
		guidesCache:       guidesCache,
		stepsRepo:         stepsRepo,
		redisClient:       redisClient,
	}
}

func (s *GuidesService) Create(ctx context.Context, userID string, req *types.CreateGuideRequest) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	guideCreated, err := s.guidesRepo.Create(ctx, userID, &types.CreateGuideDTO{
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	return guideCreated, nil
}

func (s *GuidesService) GetAll(ctx context.Context, userID string, status *string) ([]*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if status == nil {
		guides, err := s.starredGuidesRepo.GetAllWithStarred(ctx, userID)
		if err != nil {
			return nil, err
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

	switch models.GuideStatus(*status) {
	case models.StatusDeleted:
		guides, err := s.guidesRepo.GetAllByStatus(ctx, userID, models.StatusDeleted)
		if err != nil {
			return nil, err
		}
		return guides, nil
	case models.StatusDraft, models.StatusPublished, models.StatusArchived:
		guides, err := s.starredGuidesRepo.GetAllByStatusWithStarred(ctx, userID, models.GuideStatus(*status))
		if err != nil {
			return nil, err
		}
		return guides, nil
	default:
		return nil, fmt.Errorf("invalid status: %s", *status)
	}
}

func (s *GuidesService) GetByID(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	cached, err := s.guidesCache.Get(ctx, guideID)
	if err == nil && cached != nil && cached.CreatorID == userID {
		return cached, nil
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Set(ctx, guide)

	return guide, nil
}

func (s *GuidesService) Update(ctx context.Context, userID string, guideID string, req *types.UpdateGuideRequest) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return nil, constants.ErrInvalidGuideID
	}

	updated, err := s.guidesRepo.Update(ctx, userID, &types.UpdateGuideDTO{
		ID:          parsedID,
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return updated, nil
}

func (s *GuidesService) Delete(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	deleted, err := s.guidesRepo.Delete(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if deleted == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return deleted, nil
}

func (s *GuidesService) recalculateDuration(ctx context.Context, userID string, guideID string) error {
	steps, err := s.stepsRepo.GetByGuideID(ctx, guideID)
	if err != nil {
		return err
	}

	duration := models.CalculateSyntheticDuration(steps)
	_, err = s.guidesRepo.UpdateDuration(ctx, userID, guideID, duration)
	return err
}

func (s *GuidesService) Publish(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.Status != models.StatusDraft {
		return nil, fmt.Errorf("only guides in draft status can be published")
	}

	if err := s.recalculateDuration(ctx, userID, guideID); err != nil {
		return nil, err
	}

	published, err := s.guidesRepo.Publish(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if published == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return published, nil
}

func (s *GuidesService) Unpublish(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in published status can be unpublished")
	}

	unpublished, err := s.guidesRepo.Unpublish(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if unpublished == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return unpublished, nil
}

func (s *GuidesService) Archive(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.Status != models.StatusDraft && guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in draft or published status can be archived")
	}

	archived, err := s.guidesRepo.Archive(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if archived == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return archived, nil
}

func (s *GuidesService) Unarchive(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}
	if guide.Status != models.StatusArchived {
		return nil, fmt.Errorf("only guides in archived status can be unarchived")
	}

	unarchived, err := s.guidesRepo.Unarchive(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if unarchived == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return unarchived, nil
}

func (s *GuidesService) Restore(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	restored, err := s.guidesRepo.Restore(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if restored == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return restored, nil
}

func (s *GuidesService) GetCount(ctx context.Context, userID string) (int, error) {
	if strings.TrimSpace(userID) == "" {
		return 0, constants.ErrInvalidUserID
	}

	count, err := s.guidesRepo.GetCount(ctx, userID)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *GuidesService) PermanentlyDelete(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	deleted, err := s.guidesRepo.PermanentlyDelete(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	if deleted == nil {
		return nil, constants.ErrGuideNotFound
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

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

func (s *GuidesService) RecalculateDuration(ctx context.Context, userID string, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, constants.ErrInvalidUserID
	}

	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := s.recalculateDuration(ctx, userID, guideID); err != nil {
		return nil, err
	}

	updated, err := s.guidesRepo.GetByID(ctx, userID, guideID)
	if err != nil {
		return nil, err
	}

	_ = s.guidesCache.Invalidate(ctx, guideID)

	return updated, nil
}
