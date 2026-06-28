package models

type IdentityType string

const (
	IdentityTypeUser    IdentityType = "user"
	IdentityTypeAPIKey  IdentityType = "api_key"
	IdentityTypeMachine IdentityType = "machine"
)

type Identity struct {
	Kind   IdentityType
	ID     string
	Claims map[string]any
}
