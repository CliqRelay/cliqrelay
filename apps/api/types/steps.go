package types

import (
	"errors"

	"github.com/google/uuid"

	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type StepID struct {
	ID string `path:"id" validate:"required,uuid"`
}

func (r *StepID) Validate() error {
	return validator.Validate.Struct(r)
}

type CreateStepRequest struct {
	GuideID            uuid.UUID                 `json:"guide_id" validate:"required,uuid" required:"true"`
	Type               models.StepType           `json:"type" validate:"required,oneof=interaction canvas" required:"true"`
	Action             *models.StepAction        `json:"action,omitempty" validate:"omitempty,oneof=click input navigation keypress"`
	ActionText         *string                   `json:"action_text,omitempty" nullable:"true"`
	URL                *string                   `json:"url,omitempty" nullable:"true"`
	Notes              *string                   `json:"notes,omitempty" nullable:"true"`
	TargetElement      map[string]any            `json:"target_element,omitempty" nullable:"true"`
	CanvasContent      *models.StepCanvasContent `json:"canvas_content,omitempty" nullable:"true"`
	InsertBeforeStepID *string                   `json:"insert_before_step_id,omitempty" nullable:"true"`
	InsertAfterStepID  *string                   `json:"insert_after_step_id,omitempty" nullable:"true"`
}

func (r *CreateStepRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}
	switch r.Type {
	case models.StepTypeInteraction:
		if r.CanvasContent != nil {
			return errors.New("canvas_content is not applicable for interaction steps")
		}
	case models.StepTypeCanvas:
		if r.Action != nil {
			return errors.New("action is not applicable for canvas steps")
		}
		if r.ActionText != nil {
			return errors.New("action_text is not applicable for canvas steps")
		}
		if r.URL != nil {
			return errors.New("url is not applicable for canvas steps")
		}
		if r.TargetElement != nil {
			return errors.New("target_element is not applicable for canvas steps")
		}
	}
	return nil
}

type CreateStepDTO struct {
	GuideID            uuid.UUID                 `json:"guide_id" validate:"required"`
	Type               models.StepType           `json:"type" validate:"required,oneof=interaction canvas"`
	Action             *models.StepAction        `json:"action,omitempty"`
	ActionText         *string                   `json:"action_text,omitempty"`
	URL                *string                   `json:"url,omitempty"`
	Notes              *string                   `json:"notes,omitempty"`
	TargetElement      map[string]any            `json:"target_element,omitempty"`
	CanvasContent      *models.StepCanvasContent `json:"canvas_content,omitempty"`
	InsertBeforeStepID *string                   `json:"insert_before_step_id,omitempty"`
	InsertAfterStepID  *string                   `json:"insert_after_step_id,omitempty"`
}

type CreateStepResponse struct {
	Step *models.Step `json:"step" required:"true" nullable:"false"`
}

type StepsByGuideIDQuery struct {
	GuideID string `query:"guide_id" validate:"required,uuid"`
}

func (r *StepsByGuideIDQuery) Validate() error {
	return validator.Validate.Struct(r)
}

type GetAllStepsResponse struct {
	Steps []*models.Step `json:"steps" required:"true" nullable:"false"`
}

type GetStepByIDResponse struct {
	Step *models.Step `json:"step" required:"true" nullable:"true"`
}

type UpdateStepRequest struct {
	Type          *models.StepType          `json:"type,omitempty" validate:"omitempty,oneof=interaction canvas"`
	Action        *models.StepAction        `json:"action,omitempty" validate:"omitempty,oneof=click input navigation keypress"`
	ActionText    *string                   `json:"action_text,omitempty" nullable:"true"`
	URL           *string                   `json:"url,omitempty" nullable:"true"`
	Notes         *string                   `json:"notes,omitempty" nullable:"true"`
	TargetElement map[string]any            `json:"target_element,omitempty" nullable:"true"`
	CanvasContent *models.StepCanvasContent `json:"canvas_content,omitempty" nullable:"true"`
}

func (r *UpdateStepRequest) Validate() error {
	if err := validator.Validate.Struct(r); err != nil {
		return err
	}
	if r.Type == nil {
		return nil
	}
	switch *r.Type {
	case models.StepTypeInteraction:
		if r.CanvasContent != nil {
			return errors.New("canvas_content is not applicable for interaction steps")
		}
	case models.StepTypeCanvas:
		if r.Action != nil {
			return errors.New("action is not applicable for canvas steps")
		}
		if r.ActionText != nil {
			return errors.New("action_text is not applicable for canvas steps")
		}
		if r.URL != nil {
			return errors.New("url is not applicable for canvas steps")
		}
		if r.TargetElement != nil {
			return errors.New("target_element is not applicable for canvas steps")
		}
	}
	return nil
}

type UpdateStepDTO struct {
	ID            uuid.UUID                 `json:"id" validate:"required"`
	Type          *models.StepType          `json:"type,omitempty"`
	Action        *models.StepAction        `json:"action,omitempty" nullable:"true"`
	ActionText    *string                   `json:"action_text,omitempty" nullable:"true"`
	URL           *string                   `json:"url,omitempty" nullable:"true"`
	Notes         *string                   `json:"notes,omitempty" nullable:"true"`
	TargetElement map[string]any            `json:"target_element,omitempty" nullable:"true"`
	CanvasContent *models.StepCanvasContent `json:"canvas_content,omitempty" nullable:"true"`
}

type UpdateStepResponse struct {
	Step *models.Step `json:"step" required:"true" nullable:"false"`
}

type DeleteStepResponse struct {
	Message string `json:"message" required:"true"`
}

type ReorderStepsRequest struct {
	GuideID      uuid.UUID `json:"guide_id" validate:"required,uuid" required:"true" nullable:"false"`
	TargetStepID string    `json:"target_step_id" validate:"required,uuid" required:"true" nullable:"false"`
	PrevStepID   *string   `json:"prev_step_id,omitempty" nullable:"true"`
	NextStepID   *string   `json:"next_step_id,omitempty" nullable:"true"`
}

func (r *ReorderStepsRequest) Validate() error {
	return validator.Validate.Struct(r)
}

type ReorderStepsResponse struct {
	Steps []*models.Step `json:"steps" required:"true" nullable:"false"`
}

type DuplicateStepRequest struct {
	InsertBeforeStepID *string   `json:"insert_before_step_id,omitempty"`
	InsertAfterStepID  *string   `json:"insert_after_step_id,omitempty"`
}

type DuplicateStepResponse struct {
	Step *models.Step `json:"step" required:"true" nullable:"false"`
}
