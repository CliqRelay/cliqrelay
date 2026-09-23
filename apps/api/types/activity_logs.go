package types

import (
	"github.com/CliqRelay/cliqrelay/models"
	"github.com/CliqRelay/cliqrelay/validator"
)

type ListActivityLogsQueryParams struct {
	TeamID string `query:"team_id" validate:"required,uuid"`
	Limit  int    `query:"limit" validate:"omitempty,gt=0,lte=50" nullable:"true"`
}

func (r *ListActivityLogsQueryParams) Validate() error {
	return validator.Validate.Struct(r)
}

type ListActivityLogsResponse struct {
	Data []*models.ActivityLog `json:"data" required:"true" nullable:"false"`
}
