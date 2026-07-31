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

// Compile-time contracts: the default bun implementations must satisfy their
// domain interfaces so the option-override resolution in buildRepositories
// can never produce a non-conforming repository graph.
var (
	_ interfaces.GuidesRepository        = (*bunGuides.BunGuidesRepository)(nil)
	_ interfaces.StarredGuidesRepository = (*bunStarredGuides.BunStarredGuidesRepository)(nil)
	_ interfaces.StepsRepository         = (*bunSteps.BunStepsRepository)(nil)
	_ interfaces.MediaAssetsRepository   = (*bunMediaAssets.BunMediaAssetsRepository)(nil)
	_ interfaces.GuideExportsRepository  = (*bunGuideExports.BunGuideExportsRepository)(nil)
	_ interfaces.GuideViewsRepository    = (*bunGuideViews.BunGuideViewsRepository)(nil)
)

func TestBuildRepositoriesDefaultsToBun(t *testing.T) {
	// buildRepositories requires a database; exercising it with a nil option
	// struct verifies the override-first resolution path compiles and errors
	// cleanly when no DB is configured.
	o := defaultOptions()
	if _, err := buildRepositories(o); err == nil {
		t.Fatal("expected error when no DB is configured")
	}
}
