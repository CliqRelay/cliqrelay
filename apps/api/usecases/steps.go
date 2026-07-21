package usecases

import (
	"context"

	authulamodels "github.com/Authula/authula/models"
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/types"
)

type StepsUseCase struct {
	authzService  interfaces.AuthorizationService
	stepsService  interfaces.StepsService
	guidesService interfaces.GuidesService
}

func NewStepsUseCase(
	authzService interfaces.AuthorizationService,
	stepsService interfaces.StepsService,
	guidesService interfaces.GuidesService,
) *StepsUseCase {
	return &StepsUseCase{
		authzService:  authzService,
		stepsService:  stepsService,
		guidesService: guidesService,
	}
}

func (uc *StepsUseCase) Create(ctx context.Context, actor *authulamodels.Actor, req *types.CreateStepRequest) (*models.Step, error) {
	workspaceID := req.WorkspaceID.String()
	guide, err := uc.guidesService.GetByID(ctx, req.GuideID.String())
	if err != nil {
		return nil, err
	}

	parsedWSID, _ := uuid.Parse(workspaceID)
	if err := uc.authzService.CanEditGuide(ctx, actor, parsedWSID.String(), guide); err != nil {
		return nil, err
	}

	return uc.stepsService.Create(ctx, workspaceID, req)
}

func (uc *StepsUseCase) ListByGuide(ctx context.Context, actor *authulamodels.Actor, guideID string) ([]*models.Step, error) {
	guide, err := uc.guidesService.GetByID(ctx, guideID)
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.stepsService.GetByGuideID(ctx, guideID)
}

func (uc *StepsUseCase) Get(ctx context.Context, actor *authulamodels.Actor, stepID string) (*models.Step, error) {
	step, err := uc.stepsService.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanReadGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return step, nil
}

func (uc *StepsUseCase) Update(ctx context.Context, actor *authulamodels.Actor, stepID string, req *types.UpdateStepRequest) (*models.Step, error) {
	step, err := uc.stepsService.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.stepsService.Update(ctx, stepID, req)
}

func (uc *StepsUseCase) Delete(ctx context.Context, actor *authulamodels.Actor, stepID string) error {
	step, err := uc.stepsService.GetByID(ctx, stepID)
	if err != nil {
		return err
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return err
	}

	return uc.stepsService.Delete(ctx, stepID)
}

func (uc *StepsUseCase) Reorder(ctx context.Context, actor *authulamodels.Actor, req *types.ReorderStepsRequest) ([]*models.Step, error) {
	workspaceID := req.WorkspaceID.String()
	guide, err := uc.guidesService.GetByID(ctx, req.GuideID.String())
	if err != nil {
		return nil, err
	}

	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.stepsService.Reorder(ctx, req.GuideID.String(), req.TargetStepID, req.PrevStepID, req.NextStepID)
}

func (uc *StepsUseCase) Duplicate(ctx context.Context, actor *authulamodels.Actor, stepID string, req *types.DuplicateStepRequest) (*models.Step, error) {
	step, err := uc.stepsService.GetByID(ctx, stepID)
	if err != nil {
		return nil, err
	}

	guide, err := uc.guidesService.GetByID(ctx, step.GuideID.String())
	if err != nil {
		return nil, err
	}

	workspaceID := guide.WorkspaceID.String()
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.stepsService.Duplicate(ctx, stepID, req)
}
