package interfaces

type DomainServices struct {
	GuidesService        GuidesService
	StepsService         StepsService
	StarredGuidesService StarredGuidesService
	MediaAssetsService   MediaAssetsService
	GuideViewsService    GuideViewsService
	ExportService        ExportService
	UploadsService       UploadsService
	PurgeService         PurgeService
	TeamsService         TeamsService
}
