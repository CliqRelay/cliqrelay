package constants

import "errors"

var (
	ErrUnauthorized = errors.New("unauthorized")

	ErrInvalidUserID           = errors.New("invalid user ID")
	ErrInvalidGuideID          = errors.New("invalid guide ID")
	ErrGuideNotFound           = errors.New("guide not found")
	ErrGuideDeleted            = errors.New("guide has been deleted")
	ErrGuidePermanentlyDeleted = errors.New("guide has been permanently deleted")
	ErrGuideNotOwnedByUser     = errors.New("you do not own this guide")

	ErrInvalidStepID        = errors.New("invalid step ID")
	ErrStepNotFound         = errors.New("step not found")
	ErrInvalidMediaAssetID  = errors.New("invalid media asset ID")
	ErrMediaAssetNotFound   = errors.New("media asset not found")
	ErrInvalidContentType   = errors.New("invalid content type")
	ErrStepNotInGuide       = errors.New("step does not belong to the specified guide")
	ErrMediaAssetCopyFailed = errors.New("failed to copy media asset")

	ErrTeamNotFound     = errors.New("team not found")
	ErrTeamAccessDenied = errors.New("team access denied")

	ErrOrganizationNotFound     = errors.New("organization not found")
	ErrOrganizationAccessDenied = errors.New("organization access denied")

	ErrGuideAccessDenied       = errors.New("you do not have permission to access this guide")
	ErrGuideCreateDenied       = errors.New("you do not have permission to create guides")
	ErrGuideEditDenied         = errors.New("you do not have permission to edit this guide")
	ErrGuideReadDenied         = errors.New("you do not have permission to view this guide")
	ErrGuideDeleteDenied       = errors.New("you do not have permission to delete this guide")
	ErrGuideNotPublished       = errors.New("guide must be published to record views")
	ErrCannotSetGuideToPrivate = errors.New("only the creator can set a guide to private")
)
