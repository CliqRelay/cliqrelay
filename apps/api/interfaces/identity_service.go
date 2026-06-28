package interfaces

import (
	"context"

	"github.com/CliqRelay/cliqrelay/models"
)

type IdentityService interface {
	Current(ctx context.Context) *models.Identity
}
