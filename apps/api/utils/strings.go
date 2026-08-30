package utils

import (
	"strings"
	"unicode"
)

// Slugify converts a string into a URL-friendly slug by lowercasing it and
// replacing every run of non-alphanumeric characters with a single hyphen,
// e.g. "John Doe's Org" becomes "john-doe-s-org".
func Slugify(value string) string {
	var builder strings.Builder
	builder.Grow(len(value))

	pendingHyphen := false

	for _, r := range value {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			if pendingHyphen && builder.Len() > 0 {
				builder.WriteRune('-')
			}

			pendingHyphen = false

			builder.WriteRune(unicode.ToLower(r))

			continue
		}

		pendingHyphen = true
	}

	return builder.String()
}
