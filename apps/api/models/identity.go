package models

type IdentityType string

const (
	IdentityTypeUser   IdentityType = "user"
	IdentityTypeM2M    IdentityType = "m2m"
	IdentityTypeAPIKey IdentityType = "api_key"
)

type Identity struct {
	Kind   IdentityType
	ID     string
	Claims map[string]any
}
