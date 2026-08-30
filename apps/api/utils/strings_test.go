package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSlugify(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name     string
		value    string
		expected string
	}{
		{name: "empty string", value: "", expected: ""},
		{name: "simple name", value: "John Doe", expected: "john-doe"},
		{name: "apostrophe", value: "John Doe's Org", expected: "john-doe-s-org"},
		{name: "already a slug", value: "acme-corp", expected: "acme-corp"},
		{name: "collapses repeated separators", value: "Acme   ---  Corp", expected: "acme-corp"},
		{name: "trims leading and trailing separators", value: "  !Acme Corp!  ", expected: "acme-corp"},
		{name: "keeps digits", value: "Team 42 (2026)", expected: "team-42-2026"},
		{name: "punctuation only", value: "!!! ???", expected: ""},
		{name: "unicode letters", value: "Café Münchén", expected: "café-münchén"},
		{name: "underscores and slashes", value: "sales_ops/team", expected: "sales-ops-team"},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := Slugify(tt.value)
			assert.Equal(t, tt.expected, got)
		})
	}
}
