package models

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestCalculateSyntheticDuration(t *testing.T) {
	t.Parallel()

	interactionStep := func(action StepAction, actionText, notes *string) *Step {
		return &Step{
			ID:         uuid.New(),
			Type:       StepTypeInteraction,
			Action:     &action,
			ActionText: actionText,
			Notes:      notes,
		}
	}

	canvasStep := func(content *StepCanvasContent, notes *string) *Step {
		return &Step{
			ID:            uuid.New(),
			Type:          StepTypeCanvas,
			CanvasContent: content,
			Notes:         notes,
		}
	}

	cases := []struct {
		name  string
		steps []*Step
		want  int
	}{
		{
			name:  "no steps has no duration and no overhead",
			steps: []*Step{},
			want:  0,
		},
		{
			name:  "single click step is overhead plus the step baseline",
			steps: []*Step{interactionStep(StepActionClick, nil, nil)},
			want:  GuideOverheadSeconds + StepBaselineSeconds,
		},
		{
			name:  "single input step uses the input baseline",
			steps: []*Step{interactionStep(StepActionInput, nil, nil)},
			want:  GuideOverheadSeconds + InputStepBaselineSeconds,
		},
		{
			name:  "canvas step without content uses the step baseline",
			steps: []*Step{canvasStep(nil, nil)},
			want:  GuideOverheadSeconds + StepBaselineSeconds,
		},
		{
			// 5 words / 200 * 60 = 1.5 -> 2
			name:  "interaction step adds reading time for its action text",
			steps: []*Step{interactionStep(StepActionClick, new("click the submit button now"), nil)},
			want:  GuideOverheadSeconds + StepBaselineSeconds + 2,
		},
		{
			// 7 words / 200 * 60 = 2.1 -> 2
			name:  "interaction step adds reading time for its notes",
			steps: []*Step{interactionStep(StepActionClick, nil, new("please remember to check the settings first"))},
			want:  GuideOverheadSeconds + StepBaselineSeconds + 2,
		},
		{
			// 4 + 7 = 11 words / 200 * 60 = 3.3 -> 3
			name: "canvas step adds reading time for its heading and body",
			steps: []*Step{canvasStep(&StepCanvasContent{
				HeadingText: new("welcome to this guide"),
				BodyText:    new("follow these steps to complete the task"),
			}, nil)},
			want: GuideOverheadSeconds + StepBaselineSeconds + 3,
		},
		{
			// 8 words / 200 * 60 = 2.4 -> 2
			name:  "canvas step adds reading time for its notes",
			steps: []*Step{canvasStep(nil, new("this is an important note for the canvas"))},
			want:  GuideOverheadSeconds + StepBaselineSeconds + 2,
		},
		{
			name: "overhead is charged once across multiple steps",
			steps: []*Step{
				interactionStep(StepActionClick, nil, nil),
				interactionStep(StepActionInput, nil, nil),
				interactionStep(StepActionNavigation, nil, nil),
				canvasStep(nil, nil),
			},
			want: GuideOverheadSeconds + StepBaselineSeconds*3 + InputStepBaselineSeconds,
		},
		{
			// canvas    3 + 9 + 6 = 18 words -> 5.4 -> 5
			// click     4 words        -> 1.2 -> 1
			// input     7 words        -> 2.1 -> 2
			// navigation no words      -> 0
			name: "realistic guide",
			steps: []*Step{
				canvasStep(&StepCanvasContent{
					HeadingText: new("welcome to setup"),
					BodyText:    new("this guide will walk through the initial configuration process"),
				}, new("take your time reading each section")),
				interactionStep(StepActionClick, new("click the next button"), nil),
				interactionStep(StepActionInput, nil, new("make sure you have your credentials ready")),
				interactionStep(StepActionNavigation, nil, nil),
			},
			want: GuideOverheadSeconds + (StepBaselineSeconds + 5) + (StepBaselineSeconds + 1) + (InputStepBaselineSeconds + 2) + StepBaselineSeconds,
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			assert.Equal(t, tt.want, CalculateSyntheticDuration(tt.steps))
		})
	}
}
