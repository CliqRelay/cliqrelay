package bootstrap

import (
	"testing"

	"github.com/CliqRelay/cliqrelay/interfaces"
	bunGuideExports "github.com/CliqRelay/cliqrelay/repositories/guide_exports"
	bunGuideViews "github.com/CliqRelay/cliqrelay/repositories/guide_views"
	bunGuides "github.com/CliqRelay/cliqrelay/repositories/guides"
	bunMediaAssets "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	bunStarredGuides "github.com/CliqRelay/cliqrelay/repositories/starred_guides"
	bunSteps "github.com/CliqRelay/cliqrelay/repositories/steps"
)

// Ensures at compile time that our Bun database repositories correctly implement all domain interfaces.
var (
	_ interfaces.GuidesRepository        = (*bunGuides.BunGuidesRepository)(nil)
	_ interfaces.StarredGuidesRepository = (*bunStarredGuides.BunStarredGuidesRepository)(nil)
	_ interfaces.StepsRepository         = (*bunSteps.BunStepsRepository)(nil)
	_ interfaces.MediaAssetsRepository   = (*bunMediaAssets.BunMediaAssetsRepository)(nil)
	_ interfaces.GuideExportsRepository  = (*bunGuideExports.BunGuideExportsRepository)(nil)
	_ interfaces.GuideViewsRepository    = (*bunGuideViews.BunGuideViewsRepository)(nil)
)

func TestBuildRepositoriesDefaultsToBun(t *testing.T) {
	// Checks that missing a DB connection correctly triggers an error during default repository setup.
	o := defaultOptions()
	if _, err := buildRepositories(o); err == nil {
		t.Fatal("expected error when no DB is configured")
	}
}
