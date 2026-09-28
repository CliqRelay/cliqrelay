package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/CliqRelay/cliqrelay/models"
)

func TestIsGuidePubliclyReadable(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name       string
		visibility models.Visibility
		status     models.GuideStatus
		expected   bool
	}{
		{name: "public published guide", visibility: models.VisibilityPublic, status: models.StatusPublished, expected: true},
		{name: "public draft guide", visibility: models.VisibilityPublic, status: models.StatusDraft, expected: false},
		{name: "public archived guide", visibility: models.VisibilityPublic, status: models.StatusArchived, expected: false},
		{name: "public guide in the trash", visibility: models.VisibilityPublic, status: models.StatusDeleted, expected: false},
		{name: "team guide", visibility: models.VisibilityTeam, status: models.StatusPublished, expected: false},
		{name: "private guide", visibility: models.VisibilityPrivate, status: models.StatusPublished, expected: false},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			guide := &models.Guide{Visibility: tt.visibility, Status: tt.status}

			assert.Equal(t, tt.expected, IsGuidePubliclyReadable(guide))
		})
	}
}
