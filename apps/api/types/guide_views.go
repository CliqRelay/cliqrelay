package types

import (
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/validator"
)

type CreateGuideViewDTO struct {
	TeamID    uuid.UUID  `json:"team_id" validate:"required,uuid"`
	GuideID   uuid.UUID  `json:"guide_id" validate:"required,uuid"`
	ViewerID  *uuid.UUID `json:"viewer_id,omitempty" validate:"omitempty,required,uuid"`
	IPHash    *string    `json:"ip_hash,omitempty"`
	UserAgent *string    `json:"user_agent,omitempty"`
	ViewedAt  time.Time  `json:"viewed_at" validate:"required"`
}

func (r *CreateGuideViewDTO) Validate() error {
	return validator.Validate.Struct(r)
}

type RecordGuideViewRequest struct {
	GuideID string `path:"id" validate:"required,uuid"`
}

func (r *RecordGuideViewRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type RecordGuideViewResponse struct {
	Message string `json:"message" required:"true" nullable:"false"`
}

type GetGuideViewsCountQueryParams struct {
	TeamID uuid.UUID `query:"team_id" validate:"required,uuid"`
}

func (r *GetGuideViewsCountQueryParams) Validate() error {
	return validator.Validate.Struct(r)
}

type GetGuideViewsCountResponse struct {
	Count int `json:"count" required:"true" nullable:"false"`
}
