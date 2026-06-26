package interfaces

type DomainServices struct {
	GuidesService        GuidesService
	StepsService         StepsService
	StarredGuidesService StarredGuidesService
	MediaAssetsService   MediaAssetsService
	ExportService        ExportService
	UploadsService       UploadsService
	PurgeService         PurgeService
}
