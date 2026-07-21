package interfaces

type DomainServices struct {
	WorkspaceService     WorkspaceService
	GuidesService        GuidesService
	StepsService         StepsService
	StarredGuidesService StarredGuidesService
	MediaAssetsService   MediaAssetsService
	ExportService        ExportService
	UploadsService       UploadsService
	PurgeService         PurgeService
}
