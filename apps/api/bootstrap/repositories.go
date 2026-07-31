package bootstrap

import (
	"github.com/CliqRelay/cliqrelay/interfaces"
	bunGuideExports "github.com/CliqRelay/cliqrelay/repositories/guide_exports"
	bunGuideViews "github.com/CliqRelay/cliqrelay/repositories/guide_views"
	bunGuides "github.com/CliqRelay/cliqrelay/repositories/guides"
	bunMediaAssets "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	bunStarredGuides "github.com/CliqRelay/cliqrelay/repositories/starred_guides"
	bunSteps "github.com/CliqRelay/cliqrelay/repositories/steps"
)

func buildRepositories(o *options) (*interfaces.Repositories, error) {
	db, err := o.dbOrAuthulaDB()
	if err != nil {
		return nil, err
	}

	repos := &interfaces.Repositories{
		Guides:        o.guidesRepo,
		Steps:         o.stepsRepo,
		MediaAssets:   o.mediaAssetsRepo,
		StarredGuides: o.starredGuidesRepo,
		GuideExports:  o.guideExportsRepo,
		GuideViews:    o.guideViewsRepo,
	}

	if repos.Guides == nil {
		repos.Guides = bunGuides.NewBunGuidesRepository(db)
	}
	if repos.Steps == nil {
		repos.Steps = bunSteps.NewBunStepsRepository(db)
	}
	if repos.MediaAssets == nil {
		repos.MediaAssets = bunMediaAssets.NewBunMediaAssetsRepository(db)
	}
	if repos.StarredGuides == nil {
		repos.StarredGuides = bunStarredGuides.NewBunStarredGuidesRepository(db)
	}
	if repos.GuideExports == nil {
		repos.GuideExports = bunGuideExports.NewBunGuideExportsRepository(db)
	}
	if repos.GuideViews == nil {
		repos.GuideViews = bunGuideViews.NewBunGuideViewsRepository(db)
	}

	return repos, nil
}
