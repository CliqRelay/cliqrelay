package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsService interface {
	GeneratePresignedPutURL(ctx context.Context, workspaceID, guideID, stepID string) (*types.PresignedURLResult, error)
	CompleteUpload(ctx context.Context, workspaceID, stepID, storagePath string, fileSize *int, mimeType *string, thumbnail *string, width *int, height *int) (*types.CompleteUploadResponse, error)
}
