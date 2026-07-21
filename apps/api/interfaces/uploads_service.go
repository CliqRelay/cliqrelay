package interfaces

import (
	"context"

	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsService interface {
	GeneratePresignedPutURL(ctx context.Context, actor *authulamodels.Actor, workspaceID, guideID, stepID string) (*types.PresignedURLResult, error)
	CompleteUpload(ctx context.Context, actor *authulamodels.Actor, workspaceID, stepID, storagePath string, fileSize *int, mimeType *string, thumbnail *string, width *int, height *int) (*types.CompleteUploadResponse, error)
}
