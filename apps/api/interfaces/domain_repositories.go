package interfaces

type Repositories struct {
	Guides        GuidesRepository
	StarredGuides StarredGuidesRepository
	Steps         StepsRepository
	MediaAssets   MediaAssetsRepository
	GuideExports  GuideExportsRepository
	GuideViews    GuideViewsRepository
	Teams         TeamsRepository
}
