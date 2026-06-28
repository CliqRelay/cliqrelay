package starred_guides

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
)

type StarredGuidesService struct {
	starredGuidesRepo interfaces.StarredGuidesRepository
	guidesRepo        interfaces.GuidesRepository
	identityService   interfaces.IdentityService
	authzService      interfaces.AuthorizationService
}

func NewStarredGuidesService(
	starredGuidesRepo interfaces.StarredGuidesRepository,
	guidesRepo interfaces.GuidesRepository,
	identityService interfaces.IdentityService,
	authzService interfaces.AuthorizationService,
) *StarredGuidesService {
	return &StarredGuidesService{
		starredGuidesRepo: starredGuidesRepo,
		guidesRepo:        guidesRepo,
		identityService:   identityService,
		authzService:      authzService,
	}
}

func (s *StarredGuidesService) Star(ctx context.Context, guideID string) error {
	identity := s.identityService.Current(ctx)
	if identity == nil {
		return constants.ErrForbidden
	}

	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}

	guide, err := s.guidesRepo.GetByID(ctx, guideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return constants.ErrGuideNotFound
	}

	if err := s.authzService.CanReadGuide(ctx, identity, guide); err != nil {
		return constants.ErrGuideNotFound
	}

	return s.starredGuidesRepo.Star(ctx, identity.ID, parsedID)
}

func (s *StarredGuidesService) Unstar(ctx context.Context, guideID string) error {
	identity := s.identityService.Current(ctx)
	if identity == nil {
		return constants.ErrForbidden
	}

	if strings.TrimSpace(guideID) == "" {
		return constants.ErrInvalidGuideID
	}
	parsedID, err := uuid.Parse(guideID)
	if err != nil {
		return constants.ErrInvalidGuideID
	}
	return s.starredGuidesRepo.Unstar(ctx, identity.ID, parsedID)
}

func (s *StarredGuidesService) GetStarredGuides(ctx context.Context) ([]*models.Guide, error) {
	identity := s.identityService.Current(ctx)
	if identity == nil {
		return nil, constants.ErrForbidden
	}

	filter, err := s.authzService.GuideListFilter(ctx, identity)
	if err != nil {
		return nil, err
	}

	rows, err := s.starredGuidesRepo.GetAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	guides := make([]*models.Guide, 0)
	for _, row := range rows {
		if row.IsStarred {
			guides = append(guides, &row.Guide)
		}
	}

	return guides, nil
}
