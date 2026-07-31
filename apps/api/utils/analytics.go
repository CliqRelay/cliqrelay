package utils

import "math"

const (
	MinManualBaselineSeconds = 120
	TimeSavedMultiplier      = 3
)

func CalculateNetSecondsSaved(durationSeconds int) int {
	if durationSeconds <= 0 {
		return 0
	}

	estimatedManualTime := max(durationSeconds*TimeSavedMultiplier, MinManualBaselineSeconds)

	return estimatedManualTime - durationSeconds
}

func ConvertSecondsToHours(totalSeconds int) float64 {
	hours := float64(totalSeconds) / 3600.0
	return math.Round(hours*10) / 10
}
