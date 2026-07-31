package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateNetSecondsSaved(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name            string
		durationSeconds int
		expected        int
	}{
		{name: "empty guide", durationSeconds: 0, expected: 0},
		{name: "negative duration", durationSeconds: -30, expected: 0},
		{name: "1-step micro guide (30s)", durationSeconds: 30, expected: 90},
		{name: "minimum net saved (40s)", durationSeconds: 40, expected: 80},
		{name: "quick 3-step guide (60s)", durationSeconds: 60, expected: 120},
		{name: "standard SOP (3 min)", durationSeconds: 180, expected: 360},
		{name: "full onboarding walkthrough (10 min)", durationSeconds: 600, expected: 1200},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := CalculateNetSecondsSaved(tt.durationSeconds)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestConvertSecondsToHours(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name         string
		totalSeconds int
		expected     float64
	}{
		{name: "zero", totalSeconds: 0, expected: 0.0},
		{name: "sub-minute truncates", totalSeconds: 90, expected: 0.0},
		{name: "one hour", totalSeconds: 3600, expected: 1.0},
		{name: "one decimal place", totalSeconds: 5400, expected: 1.5},
		{name: "rounds to one decimal", totalSeconds: 3900, expected: 1.1},
		{name: "whole hours", totalSeconds: 7200, expected: 2.0},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := ConvertSecondsToHours(tt.totalSeconds)
			assert.Equal(t, tt.expected, got)
		})
	}
}
