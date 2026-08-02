package guides

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type GuidesService struct {
	guidesRepo        interfaces.GuidesRepository
	starredGuidesRepo interfaces.StarredGuidesRepository
	stepsRepo         interfaces.StepsRepository
	redisClient       *redis.Client
	hooks             *interfaces.GuideHooks
}

func NewGuidesService(
	guidesRepo interfaces.GuidesRepository,
	starredGuidesRepo interfaces.StarredGuidesRepository,
	stepsRepo interfaces.StepsRepository,
	redisClient *redis.Client,
	hooks *interfaces.GuideHooks,
) *GuidesService {
	return &GuidesService{
		guidesRepo:        guidesRepo,
		starredGuidesRepo: starredGuidesRepo,
		stepsRepo:         stepsRepo,
		redisClient:       redisClient,
		hooks:             hooks,
	}
}

func runGuideHooks(hooks []interfaces.GuideHook, ctx context.Context, actor *authulamodels.Actor, guide *models.Guide) error {
	for _, hook := range hooks {
		if err := hook(ctx, actor, guide); err != nil {
			return err
		}
	}
	return nil
}

func runCreateGuideHooks(hooks []interfaces.CreateGuideHook, ctx context.Context, actor *authulamodels.Actor, teamID string, req *types.CreateGuideRequest) error {
	for _, hook := range hooks {
		if err := hook(ctx, actor, teamID, req); err != nil {
			return err
		}
	}
	return nil
}

func runDeleteGuideHooks(hooks []interfaces.DeleteGuideHook, ctx context.Context, actor *authulamodels.Actor, guideID string) error {
	for _, hook := range hooks {
		if err := hook(ctx, actor, guideID); err != nil {
			return err
		}
	}
	return nil
}

func (s *GuidesService) Create(ctx context.Context, actor *authulamodels.Actor, teamID string, req *types.CreateGuideRequest) (*models.Guide, error) {
	if err := runCreateGuideHooks(s.hooks.BeforeCreateHooks(), ctx, actor, teamID, req); err != nil {
		return nil, err
	}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, constants.ErrTeamNotFound
	}

	guideCreated, err := s.guidesRepo.Create(ctx, &types.CreateGuideDTO{
		TeamID:      parsedTeamID,
		CreatorID:   new(actor.ID),
		Title:       req.Title,
		Description: req.Description,
	})
	if err != nil {
		return nil, err
	}

	if err := runGuideHooks(s.hooks.AfterCreateHooks(), ctx, actor, guideCreated); err != nil {
		return nil, err
	}

	return guideCreated, nil
}

func (s *GuidesService) CreateDemoGuide(ctx context.Context, actor *authulamodels.Actor, teamID string) (string, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return "", constants.ErrTeamNotFound
	}

	guide, err := s.guidesRepo.Create(ctx, &types.CreateGuideDTO{
		TeamID:      parsedTeamID,
		CreatorID:   new(actor.ID),
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
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeHeader, HeadingText: new("Overview of CliqRelay"), BodyText: new("You can use this step to provide an overview or introduction to your guide.")},
		},
		{
			GuideID:    guide.ID,
			Type:       models.StepTypeInteraction,
			Action:     &clickAction,
			ActionText: new("Click \"Some Button\""),
			Notes:      new("This step demonstrates a click step which will be accompanied by a screenshot of the action."),
		},
		{
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeTip, HeadingText: new("This is a note"), BodyText: new("You can use this step to provide additional information or tips related to the guide.")},
		},
		{
			GuideID:       guide.ID,
			Type:          models.StepTypeCanvas,
			CanvasContent: &models.StepCanvasContent{Type: models.StepCanvasTypeCallout, HeadingText: new("Callout"), BodyText: new("This is a callout step, which can be used to draw attention to important information or warnings.")},
		},
		{
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

func (s *GuidesService) GetAll(ctx context.Context, teamID string, status *string, viewerUserID *string, excludeArchived bool, page, limit int, sortBy, sortDir string) ([]*models.Guide, int, error) {
	filter := &types.GuideFilter{}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, 0, constants.ErrTeamNotFound
	}
	filter.TeamID = &parsedTeamID
	filter.ViewerUserID = viewerUserID
	if viewerUserID != nil {
		filter.AccessibleOnly = true
	}
	filter.ExcludeArchived = excludeArchived

	if status != nil {
		if !slices.Contains([]string{
			models.StatusDraft.ToString(),
			models.StatusPublished.ToString(),
			models.StatusArchived.ToString(),
			models.StatusDeleted.ToString(),
		}, *status) {
			return nil, 0, fmt.Errorf("invalid status: %s", *status)
		}
		statusVal := models.GuideStatus(*status)
		filter.Status = &statusVal

		if statusVal == models.StatusPublished {
			filter.PublishedOnly = true
		}

		if statusVal == models.StatusArchived {
			filter.ArchivedOnly = true
		}
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	filter.Offset = (page - 1) * limit
	filter.Limit = limit

	if sortBy != "" {
		switch sortBy {
		case string(types.GuideSortCreatedAt):
			filter.SortBy = types.GuideSortCreatedAt
		case string(types.GuideSortUpdatedAt):
			filter.SortBy = types.GuideSortUpdatedAt
		default:
			return nil, 0, fmt.Errorf("invalid sort_by: %s (must be created_at or updated_at)", sortBy)
		}
		filter.SortDesc = sortDir != "asc"
	}

	return s.guidesRepo.GetAll(ctx, filter)
}

func (s *GuidesService) GetByID(ctx context.Context, guideID string) (*models.Guide, error) {
	if strings.TrimSpace(guideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if guide == nil || guide.Status == models.StatusDeleted {
		return nil, constants.ErrGuideNotFound
	}

	return guide, nil
}

func (s *GuidesService) GetByIDUnfiltered(ctx context.Context, guideID string) (*models.Guide, error) {
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

	if err := runGuideHooks(s.hooks.BeforeUpdateHooks(), ctx, actor, existing); err != nil {
		return nil, err
	}

	updated, err := s.guidesRepo.Update(ctx, &types.UpdateGuideDTO{
		ID:          parsedID,
		TeamID:      existing.TeamID,
		Title:       req.Title,
		Description: req.Description,
		Visibility:  req.Visibility,
	})
	if err != nil {
		return nil, err
	}

	if err := runGuideHooks(s.hooks.AfterUpdateHooks(), ctx, actor, updated); err != nil {
		return nil, err
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

	if err := runDeleteGuideHooks(s.hooks.BeforeDeleteHooks(), ctx, actor, guideID); err != nil {
		return nil, err
	}

	deleted, err := s.guidesRepo.Delete(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if deleted == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := runDeleteGuideHooks(s.hooks.AfterDeleteHooks(), ctx, actor, guideID); err != nil {
		return nil, err
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

	if guide.Status != models.StatusDraft {
		return nil, fmt.Errorf("only guides in draft status can be published")
	}

	if err := runGuideHooks(s.hooks.BeforePublishHooks(), ctx, actor, guide); err != nil {
		return nil, err
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

	if err := runGuideHooks(s.hooks.AfterPublishHooks(), ctx, actor, published); err != nil {
		return nil, err
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

	if guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in published status can be unpublished")
	}

	if err := runGuideHooks(s.hooks.BeforeUnpublishHooks(), ctx, actor, guide); err != nil {
		return nil, err
	}

	unpublished, err := s.guidesRepo.Unpublish(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if unpublished == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := runGuideHooks(s.hooks.AfterUnpublishHooks(), ctx, actor, unpublished); err != nil {
		return nil, err
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

	if guide.Status != models.StatusDraft && guide.Status != models.StatusPublished {
		return nil, fmt.Errorf("only guides in draft or published status can be archived")
	}

	if err := runGuideHooks(s.hooks.BeforeArchiveHooks(), ctx, actor, guide); err != nil {
		return nil, err
	}

	archived, err := s.guidesRepo.Archive(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if archived == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := runGuideHooks(s.hooks.AfterArchiveHooks(), ctx, actor, archived); err != nil {
		return nil, err
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

	if guide.Status != models.StatusArchived {
		return nil, fmt.Errorf("only guides in archived status can be unarchived")
	}

	if err := runGuideHooks(s.hooks.BeforeUnarchiveHooks(), ctx, actor, guide); err != nil {
		return nil, err
	}

	unarchived, err := s.guidesRepo.Unarchive(ctx, guideID)
	if err != nil {
		return nil, err
	}

	if unarchived == nil {
		return nil, constants.ErrGuideNotFound
	}

	if err := runGuideHooks(s.hooks.AfterUnarchiveHooks(), ctx, actor, unarchived); err != nil {
		return nil, err
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

	return restored, nil
}

func (s *GuidesService) GetCount(ctx context.Context, teamID string, viewerUserID *string) (int, error) {
	filter := &types.GuideFilter{}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return 0, constants.ErrTeamNotFound
	}
	filter.TeamID = &parsedTeamID
	filter.ViewerUserID = viewerUserID
	if viewerUserID != nil {
		filter.AccessibleOnly = true
	}

	count, err := s.guidesRepo.GetCount(ctx, filter)
	if err != nil {
		return 0, err
	}

	return count, nil
}

func (s *GuidesService) GetOrgCount(ctx context.Context, orgID string, viewerUserID *string) (int, error) {
	filter := &types.GuideFilter{}

	parsedOrgID, err := uuid.Parse(orgID)
	if err != nil {
		return 0, constants.ErrOrganizationNotFound
	}
	filter.OrganizationID = &parsedOrgID
	filter.ViewerUserID = viewerUserID
	if viewerUserID != nil {
		filter.AccessibleOnly = true
	}

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

	if err := s.publishPurgeEvent(ctx, guideID); err != nil {
		slog.Error("failed to publish purge event", "guide_id", guideID, "err", err)
	}

	return deleted, nil
}

func (s *GuidesService) BulkDelete(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error) {
	if len(guideIDs) == 0 {
		return 0, constants.ErrInvalidGuideID
	}

	if len(guideIDs) > 100 {
		return 0, fmt.Errorf("cannot delete more than 100 guides at once")
	}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return 0, constants.ErrTeamNotFound
	}

	parsedIDs := make([]uuid.UUID, len(guideIDs))
	for i, id := range guideIDs {
		parsedIDs[i], err = uuid.Parse(id)
		if err != nil {
			return 0, constants.ErrInvalidGuideID
		}
	}

	return s.guidesRepo.BulkDelete(ctx, parsedIDs, parsedTeamID, actorID, isAdmin)
}

func (s *GuidesService) BulkRestore(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error) {
	if len(guideIDs) == 0 {
		return 0, constants.ErrInvalidGuideID
	}

	if len(guideIDs) > 100 {
		return 0, fmt.Errorf("cannot restore more than 100 guides at once")
	}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return 0, constants.ErrTeamNotFound
	}

	parsedIDs := make([]uuid.UUID, len(guideIDs))
	for i, id := range guideIDs {
		parsedIDs[i], err = uuid.Parse(id)
		if err != nil {
			return 0, constants.ErrInvalidGuideID
		}
	}

	return s.guidesRepo.BulkRestore(ctx, parsedIDs, parsedTeamID, actorID, isAdmin)
}

func (s *GuidesService) BulkPermanentlyDelete(ctx context.Context, guideIDs []string, teamID string, actorID string, isAdmin bool) (int64, error) {
	if len(guideIDs) == 0 {
		return 0, constants.ErrInvalidGuideID
	}

	if len(guideIDs) > 100 {
		return 0, fmt.Errorf("cannot permanently delete more than 100 guides at once")
	}

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return 0, constants.ErrTeamNotFound
	}

	parsedIDs := make([]uuid.UUID, len(guideIDs))
	for i, id := range guideIDs {
		parsedIDs[i], err = uuid.Parse(id)
		if err != nil {
			return 0, constants.ErrInvalidGuideID
		}
	}

	count, err := s.guidesRepo.BulkPermanentlyDelete(ctx, parsedIDs, parsedTeamID, actorID, isAdmin)
	if err != nil {
		return 0, err
	}

	for _, guideID := range guideIDs {
		if pubErr := s.publishPurgeEvent(ctx, guideID); pubErr != nil {
			slog.Error("failed to publish purge event", "guide_id", guideID, "err", pubErr)
		}
	}

	return count, nil
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

	return updated, nil
}
