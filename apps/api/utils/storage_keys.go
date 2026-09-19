package utils

import "fmt"

const GuideUploadsRoot = "uploads/guides/"

func GuideUploadsPrefix(guideID string) string {
	return fmt.Sprintf("%s%s/steps/", GuideUploadsRoot, guideID)
}

func StepUploadPrefix(guideID, stepID string) string {
	return fmt.Sprintf("%s%s/", GuideUploadsPrefix(guideID), stepID)
}
