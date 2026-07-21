package types

import (
	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type MediaAssetID struct {
	ID string `path:"id" validate:"required,uuid"`
}

func (r *MediaAssetID) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateMediaAssetRequest struct {
	StepID      uuid.UUID `json:"step_id" validate:"required,uuid" required:"true"`
	StoragePath string    `json:"storage_path" validate:"required" required:"true"`
	MimeType    *string   `json:"mime_type,omitempty" nullable:"true"`
	AltText     *string   `json:"alt_text,omitempty" nullable:"true"`
	Thumbnail   *string   `json:"thumbnail,omitempty" nullable:"true"`
	Height      *int      `json:"height,omitempty" nullable:"true"`
	Width       *int      `json:"width,omitempty" nullable:"true"`
	ByteSize    *int      `json:"byte_size,omitempty" nullable:"true"`
}

func (r *CreateMediaAssetRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateMediaAssetDTO struct {
	StepID      uuid.UUID
	WorkspaceID uuid.UUID
	StoragePath string
	MimeType    *string
	AltText     *string
	Thumbnail   *string
	Height      *int
	Width       *int
	ByteSize    *int
}

type CreateMediaAssetResponse struct {
	MediaAsset *models.MediaAsset `json:"media_asset" required:"true" nullable:"false"`
}

type GetAllMediaAssetsQuery struct {
	StepID string `query:"step_id" validate:"required,uuid"`
}

func (r *GetAllMediaAssetsQuery) Validate() error {
	return validator.Validate.Struct(r)
}

type GetAllMediaAssetsResponse struct {
	MediaAssets []*models.MediaAsset `json:"media_assets" required:"true" nullable:"false"`
}

type GetMediaAssetByIDResponse struct {
	MediaAsset *models.MediaAsset `json:"media_asset" required:"true" nullable:"true"`
}

type UpdateMediaAssetRequest struct {
	AltText   *string `json:"alt_text,omitempty" nullable:"true"`
	Thumbnail *string `json:"thumbnail,omitempty" nullable:"true"`
	MimeType  *string `json:"mime_type,omitempty" nullable:"true"`
	Height    *int    `json:"height,omitempty" nullable:"true"`
	Width     *int    `json:"width,omitempty" nullable:"true"`
	ByteSize  *int    `json:"byte_size,omitempty" nullable:"true"`
}

func (r *UpdateMediaAssetRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type UpdateMediaAssetDTO struct {
	ID          uuid.UUID
	WorkspaceID uuid.UUID
	AltText     *string
	Thumbnail   *string
	MimeType    *string
	Height      *int
	Width       *int
	ByteSize    *int
}

type UpdateMediaAssetResponse struct {
	MediaAsset *models.MediaAsset `json:"media_asset" required:"true" nullable:"false"`
}

type DeleteMediaAssetResponse struct {
	Message string `json:"message" required:"true"`
}
