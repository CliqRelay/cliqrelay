package types

import "github.com/CliqRelay/cliqrelay/validator"

type PresignUploadRequest struct {
	WorkspaceID string `json:"workspace_id" validate:"required,uuid"`
	GuideID     string `json:"guide_id" validate:"required,uuid"`
	StepID      string `json:"step_id"  validate:"required,uuid"`
}

func (r *PresignUploadRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type PresignUploadResponse struct {
	PresignedURL string `json:"presigned_url" required:"true"`
	StoragePath  string `json:"storage_path"  required:"true"`
}

type CompleteUploadRequest struct {
	WorkspaceID string  `json:"workspace_id" validate:"required,uuid"`
	StepID      string  `json:"step_id"       validate:"required,uuid"`
	StoragePath string  `json:"storage_path"  validate:"required"`
	FileSize    *int    `json:"file_size,omitempty"`
	MimeType    *string `json:"mime_type,omitempty"`
	Thumbnail   *string `json:"thumbnail,omitempty"`
	Width       *int    `json:"width,omitempty"`
	Height      *int    `json:"height,omitempty"`
}

func (r *CompleteUploadRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type CompleteUploadResponse struct {
	URL         string `json:"url"         required:"true"`
	StoragePath string `json:"storage_path" required:"true"`
}

type PresignedURLResult struct {
	URL         string
	StoragePath string
}
