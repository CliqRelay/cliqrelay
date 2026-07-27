package constants

import "errors"

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")

	ErrInvalidUserID           = errors.New("invalid user ID")
	ErrInvalidGuideID          = errors.New("invalid guide ID")
	ErrGuideNotFound           = errors.New("guide not found")
	ErrGuideDeleted            = errors.New("guide has been deleted")
	ErrGuidePermanentlyDeleted = errors.New("guide has been permanently deleted")
	ErrGuideNotOwnedByUser     = errors.New("you do not own this guide")

	ErrInvalidStepID = errors.New("invalid step ID")
	ErrStepNotFound  = errors.New("step not found")

	ErrInvalidMediaAssetID = errors.New("invalid media asset ID")
	ErrMediaAssetNotFound  = errors.New("media asset not found")

	ErrInvalidContentType = errors.New("invalid content type")
	ErrStepNotInGuide     = errors.New("step does not belong to the specified guide")

	ErrMediaAssetCopyFailed = errors.New("failed to copy media asset")

	ErrTeamNotFound     = errors.New("team not found")
	ErrTeamAccessDenied = errors.New("team access denied")
)
