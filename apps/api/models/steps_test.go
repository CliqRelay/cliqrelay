package models

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStep_SupportsMedia(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		step Step
		want bool
	}{
		{name: "interaction step", step: Step{Type: StepTypeInteraction}, want: true},
		{name: "callout canvas", step: Step{Type: StepTypeCanvas, CanvasContent: &StepCanvasContent{Type: StepCanvasTypeCallout}}, want: true},
		{name: "tip canvas", step: Step{Type: StepTypeCanvas, CanvasContent: &StepCanvasContent{Type: StepCanvasTypeTip}}, want: true},
		{name: "alert canvas", step: Step{Type: StepTypeCanvas, CanvasContent: &StepCanvasContent{Type: StepCanvasTypeAlert}}, want: true},
		{name: "header canvas", step: Step{Type: StepTypeCanvas, CanvasContent: &StepCanvasContent{Type: StepCanvasTypeHeader}}, want: false},
		{name: "canvas without content", step: Step{Type: StepTypeCanvas}, want: false},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, tt.step.SupportsMedia())
		})
	}
}

func TestStep_JSONOmitsClientStepID(t *testing.T) {
	t.Parallel()

	step := Step{ID: uuid.New(), Type: StepTypeInteraction, ClientStepID: new(uuid.New().String())}

	data, err := json.Marshal(step)
	require.NoError(t, err)
	assert.NotContains(t, string(data), "client_step_id")
}
