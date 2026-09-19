package types

import (
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type PresignUploadRequest struct {
	GuideID string `json:"guide_id" validate:"required,uuid"`
	StepID  string `json:"step_id"  validate:"required,uuid"`
}

func (r *PresignUploadRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type PresignUploadResponse struct {
	PresignedURL string `json:"presigned_url" required:"true"`
	StoragePath  string `json:"storage_path"  required:"true"`
}

type PresignedURLResult struct {
	URL         string
	StoragePath string
}

type ReplaceUploadRequest struct {
	StepID      string  `json:"step_id"       validate:"required,uuid"`
	StoragePath string  `json:"storage_path"  validate:"required"`
	FileSize    *int    `json:"file_size,omitempty"`
	MimeType    *string `json:"mime_type,omitempty"`
	Thumbnail   *string `json:"thumbnail,omitempty"`
	Width       *int    `json:"width,omitempty"`
	Height      *int    `json:"height,omitempty"`
}

func (r *ReplaceUploadRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type ReplaceUploadDTO struct {
	StepID      string
	StoragePath string
	FileSize    *int
	MimeType    *string
	Thumbnail   *string
	Width       *int
	Height      *int
}

type ReplaceUploadResponse struct {
	URL         string             `json:"url"          required:"true"`
	StoragePath string             `json:"storage_path" required:"true"`
	MediaAsset  *models.MediaAsset `json:"media_asset"  required:"true" nullable:"false"`
}
