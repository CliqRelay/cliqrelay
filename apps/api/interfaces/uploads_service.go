package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/types"
)

type UploadsService interface {
	GeneratePresignedPutURL(ctx context.Context, guideID, stepID string) (*types.PresignedURLResult, error)
	ReplaceUpload(ctx context.Context, dto *types.ReplaceUploadDTO) (*types.ReplaceUploadResponse, error)
}
