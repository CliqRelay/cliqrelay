package utils

import "github.com/CliqRelay/cliqrelay/models"

func IsGuidePubliclyReadable(guide *models.Guide) bool {
	return guide.Visibility == models.VisibilityPublic && guide.Status == models.StatusPublished
}
