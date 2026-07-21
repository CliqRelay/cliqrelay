package interfaces

type DomainUseCases struct {
	WorkspaceService     WorkspaceService
	GuidesUseCase        GuidesUseCase
	StepsUseCase         StepsUseCase
	StarredGuidesService StarredGuidesService
	MediaAssetsUseCase   MediaAssetsUseCase
	ExportService        ExportService
	UploadsUseCase       UploadsUseCase
	PurgeService         PurgeService
}
