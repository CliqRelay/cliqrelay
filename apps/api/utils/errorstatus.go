package utils

import (
	"errors"
	"net/http"

	"github.com/CliqRelay/cliqrelay/constants"
)

func ErrorStatus(err error) int {
	switch {
	case errors.Is(err, constants.ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(err, constants.ErrInvalidGuideID):
		return http.StatusBadRequest
	case errors.Is(err, constants.ErrGuideNotFound), errors.Is(err, constants.ErrTeamNotFound):
		return http.StatusNotFound
	case errors.Is(err, constants.ErrTeamAccessDenied),
		errors.Is(err, constants.ErrGuideAccessDenied),
		errors.Is(err, constants.ErrGuideCreateDenied),
		errors.Is(err, constants.ErrGuideEditDenied),
		errors.Is(err, constants.ErrGuideReadDenied),
		errors.Is(err, constants.ErrGuideDeleteDenied),
		errors.Is(err, constants.ErrGuideNotOwnedByUser),
		errors.Is(err, constants.ErrCannotSetGuideToPrivate):
		return http.StatusForbidden
	default:
		return http.StatusInternalServerError
	}
}
