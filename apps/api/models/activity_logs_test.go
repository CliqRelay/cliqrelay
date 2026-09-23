package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestActivityLog_Audience(t *testing.T) {
	t.Parallel()

	creatorID := "creator-1"

	cases := []struct {
		name        string
		guide       *ActivityGuideMetadata
		wantUserIDs []string
		wantVisible bool
	}{
		{name: "entry without a guide is team-wide", wantVisible: true},
		{name: "team guide is team-wide", guide: &ActivityGuideMetadata{Visibility: VisibilityTeam, CreatorID: &creatorID}, wantVisible: true},
		{name: "private guide is limited to its creator", guide: &ActivityGuideMetadata{Visibility: VisibilityPrivate, CreatorID: &creatorID}, wantUserIDs: []string{creatorID}, wantVisible: true},
		{name: "private guide without a creator is hidden", guide: &ActivityGuideMetadata{Visibility: VisibilityPrivate}},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			log := &ActivityLog{Metadata: ActivityMetadata{Guide: tt.guide}}

			userIDs, visible := log.Audience()

			assert.Equal(t, tt.wantUserIDs, userIDs)
			assert.Equal(t, tt.wantVisible, visible)
		})
	}
}
