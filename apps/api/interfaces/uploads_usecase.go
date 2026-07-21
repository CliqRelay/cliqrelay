package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsUseCase interface {
	PresignUpload(ctx context.Context, actor *authulamodels.Actor, req *types.PresignUploadRequest) (*types.PresignUploadResponse, error)
	CompleteUpload(ctx context.Context, actor *authulamodels.Actor, req *types.CompleteUploadRequest) (*types.CompleteUploadResponse, error)
}
