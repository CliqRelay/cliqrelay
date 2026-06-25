package interfaces

type DomainServices struct {
	GuidesService      GuidesService
	StepsService       StepsService
	StarredGuidesSvc   StarredGuidesService
	MediaAssetsService MediaAssetsService
	ExportService      ExportService
	UploadsService     UploadsService
	PurgeService       PurgeService
}
