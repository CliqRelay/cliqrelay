package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsService interface {
	GeneratePresignedPutURL(ctx context.Context, userID, guideID, stepID string) (*types.PresignedURLResult, error)
	CompleteUpload(ctx context.Context, userID, stepID, storagePath string, fileSize *int, mimeType *string, thumbnail *string, width *int, height *int) (*types.CompleteUploadResponse, error)
}
