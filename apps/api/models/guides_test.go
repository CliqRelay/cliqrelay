package models

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCalculateSyntheticDuration_EmptySteps(t *testing.T) {
	assert.Equal(t, 0, CalculateSyntheticDuration([]*Step{}))
}

func TestCalculateSyntheticDuration_SingleClickStepNoWords(t *testing.T) {
	action := StepActionClick
	step := &Step{
		ID:         uuid.New(),
		Type:       StepTypeInteraction,
		Action:     &action,
		ActionText: nil,
		Notes:      nil,
	}
	assert.Equal(t, 2, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_SingleInputStepNoWords(t *testing.T) {
	action := StepActionInput
	step := &Step{
		ID:         uuid.New(),
		Type:       StepTypeInteraction,
		Action:     &action,
		ActionText: nil,
		Notes:      nil,
	}
	assert.Equal(t, 3, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_SingleCanvasStepNoWords(t *testing.T) {
	step := &Step{
		ID:            uuid.New(),
		Type:          StepTypeCanvas,
		CanvasContent: nil,
		Notes:         nil,
	}
	assert.Equal(t, 2, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_InteractionStepWithActionText(t *testing.T) {
	action := StepActionClick
	actionText := "click the submit button now"
	step := &Step{
		ID:         uuid.New(),
		Type:       StepTypeInteraction,
		Action:     &action,
		ActionText: &actionText,
		Notes:      nil,
	}
	// 5 words / 225 * 60 = 1.333... → round = 1
	// baseline 2 + 1 = 3
	assert.Equal(t, 3, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_InteractionStepWithNotes(t *testing.T) {
	action := StepActionClick
	notes := "please remember to check the settings first"
	step := &Step{
		ID:         uuid.New(),
		Type:       StepTypeInteraction,
		Action:     &action,
		ActionText: nil,
		Notes:      &notes,
	}
	// 7 words / 225 * 60 = 1.866... → round = 2
	// baseline 2 + 2 = 4
	assert.Equal(t, 4, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_CanvasStepWithHeadAndBody(t *testing.T) {
	headingText := "welcome to this guide"
	bodyText := "follow these steps to complete the task"
	step := &Step{
		ID:   uuid.New(),
		Type: StepTypeCanvas,
		CanvasContent: &StepCanvasContent{
			HeadingText: &headingText,
			BodyText:    &bodyText,
		},
		Notes: nil,
	}
	// 4 + 6 = 10 words / 225 * 60 = 2.666... → round = 3
	// baseline 2 + 3 = 5
	assert.Equal(t, 5, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_CanvasStepWithNotes(t *testing.T) {
	notes := "this is an important note for the canvas"
	step := &Step{
		ID:            uuid.New(),
		Type:          StepTypeCanvas,
		CanvasContent: nil,
		Notes:         &notes,
	}
	// 7 words / 225 * 60 = 1.866... → round = 2
	// baseline 2 + 2 = 4
	assert.Equal(t, 4, CalculateSyntheticDuration([]*Step{step}))
}

func TestCalculateSyntheticDuration_MultipleSteps(t *testing.T) {
	click := StepActionClick
	input := StepActionInput
	nav := StepActionNavigation

	steps := []*Step{
		{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &click,
			ActionText: nil,
			Notes:      nil,
		},
		{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &input,
			ActionText: nil,
			Notes:      nil,
		},
		{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &nav,
			ActionText: nil,
			Notes:      nil,
		},
		{
			ID:            uuid.New(),
			Type:          StepTypeCanvas,
			CanvasContent: nil,
			Notes:         nil,
		},
	}
	// click 2 + input 3 + nav 2 + canvas 2 = 9
	assert.Equal(t, 9, CalculateSyntheticDuration(steps))
}

func TestCalculateSyntheticDuration_RealisticGuide(t *testing.T) {
	click := StepActionClick
	input := StepActionInput
	nav := StepActionNavigation

	headingText := "welcome to setup"
	bodyText := "this guide will walk through the initial configuration process"
	notesCanvas := "take your time reading each section"

	actionText := "click the next button"
	notesStep := "make sure you have your credentials ready"

	steps := []*Step{
		{
			ID:   uuid.New(),
			Type: StepTypeCanvas,
			CanvasContent: &StepCanvasContent{
				HeadingText: &headingText,
				BodyText:    &bodyText,
			},
			Notes: &notesCanvas,
		},
		{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &click,
			ActionText: &actionText,
			Notes:      nil,
		},
		{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &input,
			ActionText: nil,
			Notes:      &notesStep,
		},
		{
			ID:     uuid.New(),
			Type:   StepTypeInteraction,
			Action: &nav,
		},
	}
	// Canvas: headingText(3) + bodyText(9) + notesCanvas(6) = 18 words
	// 18 / 225 * 60 = 4.8 → round = 5
	// baseline 2 + 5 = 7
	//
	// Click: actionText(4) = 4 words
	// 4 / 225 * 60 = 1.066... → round = 1
	// baseline 2 + 1 = 3
	//
	// Input: notesStep(7) = 7 words
	// 7 / 225 * 60 = 1.866... → round = 2
	// baseline 3 + 2 = 5
	//
	// Nav: no words
	// baseline 2 + 0 = 2
	//
	// total = 7 + 3 + 5 + 2 = 17
	assert.Equal(t, 17, CalculateSyntheticDuration(steps))
}
