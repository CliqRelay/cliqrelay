package utils

import "fmt"

const GuideUploadsRoot = "uploads/guides/"
const GuideExportsRoot = "exports/guides/"

func GuideUploadsPrefix(guideID string) string {
	return fmt.Sprintf("%s%s/steps/", GuideUploadsRoot, guideID)
}

func StepUploadPrefix(guideID, stepID string) string {
	return fmt.Sprintf("%s%s/", GuideUploadsPrefix(guideID), stepID)
}

func GuideExportsPrefix(guideID string) string {
	return fmt.Sprintf("%s%s/", GuideExportsRoot, guideID)
}
