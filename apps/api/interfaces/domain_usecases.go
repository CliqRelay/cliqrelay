package interfaces

type DomainUseCases struct {
	GuidesUseCase        GuidesUseCase
	GuideViewsUseCase    GuideViewsUseCase
	StepsUseCase         StepsUseCase
	StarredGuidesService StarredGuidesService
	MediaAssetsUseCase   MediaAssetsUseCase
	ExportService        ExportService
	UploadsUseCase       UploadsUseCase
	PurgeService         PurgeService
}
