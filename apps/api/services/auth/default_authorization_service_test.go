package auth

import "testing"

func TestHasScope(t *testing.T) {
	tests := []struct {
		name     string
		scopes   []string
		required string
		want     bool
	}{
		{name: "exact match", scopes: []string{"guides:read"}, required: "guides:read", want: true},
		{name: "global wildcard", scopes: []string{"*"}, required: "guides:create", want: true},
		{name: "prefix wildcard", scopes: []string{"guides:*"}, required: "guides:create", want: true},
		{name: "prefix wildcard unrelated", scopes: []string{"organizations:*"}, required: "guides:create", want: false},
		{name: "no match", scopes: []string{"guides:read"}, required: "guides:delete", want: false},
		{name: "empty scopes", scopes: []string{}, required: "guides:read", want: false},
		{name: "nil scopes", scopes: nil, required: "guides:read", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := hasScope(tt.scopes, tt.required); got != tt.want {
				t.Errorf("hasScope(%v, %q) = %v, want %v", tt.scopes, tt.required, got, tt.want)
			}
		})
	}
}
