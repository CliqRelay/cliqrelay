package usecases

import (
	"context"
	"strings"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/constants"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsUseCase struct {
	authzService   interfaces.AuthorizationService
	uploadsService interfaces.UploadsService
	guidesService  interfaces.GuidesService
	stepsService   interfaces.StepsService
}

func NewUploadsUseCase(
	authzService interfaces.AuthorizationService,
	uploadsService interfaces.UploadsService,
	guidesService interfaces.GuidesService,
	stepsService interfaces.StepsService,
) *UploadsUseCase {
	return &UploadsUseCase{
		authzService:   authzService,
		uploadsService: uploadsService,
		guidesService:  guidesService,
		stepsService:   stepsService,
	}
}

func (uc *UploadsUseCase) PresignUpload(ctx context.Context, actor *authulamodels.Actor, req *types.PresignUploadRequest) (*types.PresignUploadResponse, error) {
	if strings.TrimSpace(req.GuideID) == "" {
		return nil, constants.ErrInvalidGuideID
	}
	if strings.TrimSpace(req.StepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	guide, err := uc.guidesService.GetByID(ctx, req.GuideID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, constants.ErrGuideNotFound
	}

	workspaceID := req.WorkspaceID
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	result, err := uc.uploadsService.GeneratePresignedPutURL(ctx, workspaceID, req.GuideID, req.StepID)
	if err != nil {
		return nil, err
	}

	return &types.PresignUploadResponse{
		PresignedURL: result.URL,
		StoragePath:  result.StoragePath,
	}, nil
}

func (uc *UploadsUseCase) CompleteUpload(ctx context.Context, actor *authulamodels.Actor, req *types.CompleteUploadRequest) (*types.CompleteUploadResponse, error) {
	if strings.TrimSpace(req.StepID) == "" {
		return nil, constants.ErrInvalidStepID
	}

	step, err := uc.stepsService.GetByID(ctx, req.StepID)
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

	workspaceID := req.WorkspaceID
	if err := uc.authzService.CanEditGuide(ctx, actor, workspaceID, guide); err != nil {
		return nil, err
	}

	return uc.uploadsService.CompleteUpload(ctx, workspaceID, req.StepID, req.StoragePath, req.FileSize, req.MimeType, req.Thumbnail, req.Width, req.Height)
}
