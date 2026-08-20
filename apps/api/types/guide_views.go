package types

import (
	"time"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/validator"
)

type CreateGuideViewDTO struct {
	TeamID          uuid.UUID  `json:"team_id" validate:"required,uuid"`
	GuideID         uuid.UUID  `json:"guide_id" validate:"required,uuid"`
	ViewerID        *uuid.UUID `json:"viewer_id,omitempty" validate:"omitempty,required,uuid"`
	IPHash          *string    `json:"ip_hash,omitempty"`
	UserAgent       *string    `json:"user_agent,omitempty"`
	DurationSeconds int        `json:"duration_seconds"`
	ViewedAt        time.Time  `json:"viewed_at" validate:"required"`
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

type GetTimeSavedQueryParams struct {
	TeamID uuid.UUID  `query:"team_id" validate:"required,uuid"`
	Since  *time.Time `query:"since" validate:"omitempty" nullable:"true"`
}

func (r *GetTimeSavedQueryParams) Validate() error {
	return validator.Validate.Struct(r)
}

type GetTimeSavedResponse struct {
	TimeSavedSeconds int     `json:"time_saved_seconds" required:"true" nullable:"false"`
	TimeSavedHours   float64 `json:"time_saved_hours" required:"true" nullable:"false"`
}

// GuideViewStats aggregates recorded views by the duration that was snapshotted onto
// them, which is all the time saved calculation needs.
type GuideViewStats struct {
	ViewCount       int `bun:"view_count"`
	DurationSeconds int `bun:"duration_seconds"`
}
