package bootstrap

import (
	"time"

	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/services/export"
	guideviewsservice "github.com/CliqRelay/cliqrelay/services/guide_views"
	guidesservice "github.com/CliqRelay/cliqrelay/services/guides"
	mediaassetsservice "github.com/CliqRelay/cliqrelay/services/media_assets"
	"github.com/CliqRelay/cliqrelay/services/presign"
	"github.com/CliqRelay/cliqrelay/services/purge"
	starredguidesservice "github.com/CliqRelay/cliqrelay/services/starred_guides"
	stepsservice "github.com/CliqRelay/cliqrelay/services/steps"
	"github.com/CliqRelay/cliqrelay/services/storage"
	teamsservice "github.com/CliqRelay/cliqrelay/services/teams"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
)

type builtServices struct {
	Storage interfaces.StorageService
	Presign interfaces.PresignService
	Domain  *interfaces.DomainServices
}

func buildServices(o *options, repos *interfaces.Repositories) *builtServices {
	storageService := storage.NewS3StorageService(o.infraCfg.S3Client)
	presignService := presign.NewAWSPresignService(o.infraCfg.S3Client, 24*time.Hour)

	guidesService := guidesservice.NewGuidesService(repos.Guides, repos.StarredGuides, repos.Steps, o.infraCfg.RedisClient, o.guideHooks)
	starredService := starredguidesservice.NewStarredGuidesService(repos.StarredGuides, repos.Guides)
	stepsService := stepsservice.NewStepsService(o.infraCfg.RedisClient, repos.Steps, repos.Guides, presignService, storageService, repos.MediaAssets, o.infraCfg.S3Bucket, o.infraCfg.Logger, o.stepHooks)
	mediaAssetsService := mediaassetsservice.NewMediaAssetsService(repos.MediaAssets, repos.Steps, repos.Guides, o.mediaHooks)
	exportService := export.NewExportService(repos.GuideExports, repos.Guides, repos.Steps, storageService, presignService, o.infraCfg.RedisClient, o.infraCfg.S3Bucket)
	uploadsService := uploadsservice.NewUploadsService(repos.Guides, repos.Steps, repos.MediaAssets, presignService, o.infraCfg.S3Bucket)
	guideViewsService := guideviewsservice.NewGuideViewsService(repos.GuideViews, o.infraCfg.RedisClient)
	teamsService := teamsservice.NewTeamsService(repos.Teams)
	purgeService := purge.NewPurgeService(repos.Guides, storageService, guideViewsService, o.infraCfg.S3Bucket)

	return &builtServices{
		Storage: storageService,
		Presign: presignService,
		Domain: &interfaces.DomainServices{
			GuidesService:        guidesService,
			StepsService:         stepsService,
			StarredGuidesService: starredService,
			MediaAssetsService:   mediaAssetsService,
			GuideViewsService:    guideViewsService,
			ExportService:        exportService,
			UploadsService:       uploadsService,
			PurgeService:         purgeService,
			TeamsService:         teamsService,
		},
	}
}
