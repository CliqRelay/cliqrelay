package usecases

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type MediaAssetsUseCase struct {
	authzService       interfaces.AuthorizationService
	mediaAssetsService interfaces.MediaAssetsService
	stepsService       interfaces.StepsService
	guidesService      interfaces.GuidesService
}

func NewMediaAssetsUseCase(
	authzService interfaces.AuthorizationService,
	mediaAssetsService interfaces.MediaAssetsService,
	stepsService interfaces.StepsService,
	guidesService interfaces.GuidesService,
) *MediaAssetsUseCase {
	return &MediaAssetsUseCase{
		authzService:       authzService,
		mediaAssetsService: mediaAssetsService,
		stepsService:       stepsService,
		guidesService:      guidesService,
	}
}

func (uc *MediaAssetsUseCase) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateMediaAssetRequest) (*models.MediaAsset, error) {
	workspaceID := req.WorkspaceID.String()

	step, err := uc.stepsService.GetByID(ctx, req.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.mediaAssetsService.Create(ctx, workspaceID, req)
}

func (uc *MediaAssetsUseCase) ListByStep(ctx context.Context, actor *authulamodels.Actor, stepID string) ([]*models.MediaAsset, error) {
	step, err := uc.stepsService.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.mediaAssetsService.GetByStepID(ctx, stepID)
}

func (uc *MediaAssetsUseCase) Get(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error) {
	mediaAsset, err := uc.mediaAssetsService.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}

	step, err := uc.stepsService.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return mediaAsset, nil
}

func (uc *MediaAssetsUseCase) Update(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string, req *types.UpdateMediaAssetRequest) (*models.MediaAsset, error) {
	mediaAsset, err := uc.mediaAssetsService.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}

	step, err := uc.stepsService.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.mediaAssetsService.Update(ctx, mediaAssetID, req)
}

func (uc *MediaAssetsUseCase) Delete(ctx context.Context, actor *authulamodels.Actor, mediaAssetID string) (*models.MediaAsset, error) {
	mediaAsset, err := uc.mediaAssetsService.GetByID(ctx, mediaAssetID)
	if err != nil {
		return nil, err
	}

	step, err := uc.stepsService.GetByID(ctx, mediaAsset.StepID.String())
	if err != nil {
		return nil, err
	}
	if step == nil {
		return nil, constants.ErrStepNotFound
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.mediaAssetsService.Delete(ctx, mediaAssetID)
}
