package activitylogs

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/events"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type ActivityLogsService struct {
	repo            interfaces.ActivityLogsRepository
	realtimeService interfaces.RealtimeService
	logger          *slog.Logger
}

func NewActivityLogsService(repo interfaces.ActivityLogsRepository, realtimeService interfaces.RealtimeService, logger *slog.Logger) *ActivityLogsService {
	if logger == nil {
		logger = slog.Default()
	}
	return &ActivityLogsService{repo: repo, realtimeService: realtimeService, logger: logger}
}

func (s *ActivityLogsService) Record(ctx context.Context, payload *events.ActivityRecordedPayload) error {
	log, err := activityLogFromPayload(payload)
	if err != nil {
		return err
	}

	if log.OrganizationID == uuid.Nil {
		if log.OrganizationID, err = s.teamOrganizationID(ctx, log.TeamID); err != nil {
			return err
		}
	}

	if log.ActorType == models.ActivityActorUser {
		user, err := s.repo.GetUserByID(ctx, log.ActorID)
		if err != nil {
			return fmt.Errorf("get actor: %w", err)
		}
		if user != nil {
			log.Metadata.User = &models.ActivityUserMetadata{Name: user.Name}
		}
	}

	stored, changed, err := s.store(ctx, log)
	if err != nil {
		return fmt.Errorf("insert activity log: %w", err)
	}

	if guide := log.Metadata.Guide; log.EventType == models.ActivityGuideUpdated && log.TargetType == models.ActivityTargetGuide && guide != nil {
		if err := s.repo.SyncGuideVisibility(ctx, log.TargetID, guide.Visibility); err != nil {
			return fmt.Errorf("sync guide visibility: %w", err)
		}
	}

	// Realtime channels are per team, so organization-level activity is only listed.
	audience, visible := stored.Audience()
	if !changed || !visible || stored.TeamID == nil {
		return nil
	}

	// The row is already committed and a retry would be a no-op, so a failed
	// publish is only logged; clients backfill from the list on reconnect.
	if err := s.realtimeService.Publish(ctx, *stored.TeamID, types.RealtimeEventActivity, stored, audience...); err != nil {
		s.logger.Error("failed to publish activity", "activity_id", stored.ID, "err", err)
	}
	return nil
}

func (s *ActivityLogsService) teamOrganizationID(ctx context.Context, teamID *uuid.UUID) (uuid.UUID, error) {
	if teamID == nil {
		return uuid.Nil, fmt.Errorf("%w: organization_id or team_id is required", constants.ErrInvalidActivityPayload)
	}
	organizationID, err := s.repo.GetTeamOrganizationID(ctx, *teamID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("get team organization: %w", err)
	}
	if organizationID == uuid.Nil {
		return uuid.Nil, fmt.Errorf("%w: team %s not found", constants.ErrInvalidActivityPayload, teamID)
	}
	return organizationID, nil
}

func (s *ActivityLogsService) store(ctx context.Context, log *models.ActivityLog) (*models.ActivityLog, bool, error) {
	if log.EventType == models.ActivityGuideUpdated {
		return s.repo.InsertOrMergeUpdate(ctx, log, models.ActivityUpdateMergeWindow)
	}
	inserted, err := s.repo.Insert(ctx, log)
	return log, inserted, err
}

func activityLogFromPayload(p *events.ActivityRecordedPayload) (*models.ActivityLog, error) {
	// The event ID doubles as the row ID so a redelivered event is ignored on insert.
	eventID, err := uuid.Parse(p.EventID)
	if err != nil {
		return nil, fmt.Errorf("%w: event_id: %v", constants.ErrInvalidActivityPayload, err)
	}
	if p.ActorID == "" || p.ActorType == "" || p.TargetID == "" || p.TargetType == "" {
		return nil, fmt.Errorf("%w: actor_id, actor_type, target_id and target_type are required", constants.ErrInvalidActivityPayload)
	}

	log := &models.ActivityLog{
		ID:         eventID,
		ActorID:    p.ActorID,
		ActorType:  p.ActorType,
		EventType:  models.ActivityEventType(p.EventType),
		TargetID:   p.TargetID,
		TargetType: p.TargetType,
		Metadata:   p.Metadata,
		CreatedAt:  p.OccurredAt,
	}
	if p.OrganizationID != "" {
		if log.OrganizationID, err = uuid.Parse(p.OrganizationID); err != nil {
			return nil, fmt.Errorf("%w: organization_id: %v", constants.ErrInvalidActivityPayload, err)
		}
	}
	if p.TeamID != nil {
		teamID, err := uuid.Parse(*p.TeamID)
		if err != nil {
			return nil, fmt.Errorf("%w: team_id: %v", constants.ErrInvalidActivityPayload, err)
		}
		log.TeamID = &teamID
	}
	return log, nil
}

func (s *ActivityLogsService) List(ctx context.Context, teamID uuid.UUID, viewerUserID string, limit int) ([]*models.ActivityLog, error) {
	return s.repo.ListByTeam(ctx, teamID, viewerUserID, limit)
}

func (s *ActivityLogsService) DeleteByTarget(ctx context.Context, targetType, targetID string) error {
	return s.repo.DeleteByTarget(ctx, targetType, targetID)
}
