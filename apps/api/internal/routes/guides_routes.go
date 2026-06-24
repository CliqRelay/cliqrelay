package routes

import (
	"fmt"
	"net/http"
	"time"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/internal"
	"github.com/CliqRelay/cliqrelay/internal/handlers/guides"
	"github.com/CliqRelay/cliqrelay/internal/openapi"
	guideexportrepositories "github.com/CliqRelay/cliqrelay/internal/repositories/guide_exports"
	guidesrepositories "github.com/CliqRelay/cliqrelay/internal/repositories/guides"
	starredguidesrepositories "github.com/CliqRelay/cliqrelay/internal/repositories/starred_guides"
	stepsrepositories "github.com/CliqRelay/cliqrelay/internal/repositories/steps"
	"github.com/CliqRelay/cliqrelay/internal/services/export"
	guidesservices "github.com/CliqRelay/cliqrelay/internal/services/guides"
	"github.com/CliqRelay/cliqrelay/internal/services/presign"
	starredguidesservices "github.com/CliqRelay/cliqrelay/internal/services/starred_guides"
	"github.com/CliqRelay/cliqrelay/internal/services/storage"
	"github.com/CliqRelay/cliqrelay/internal/types"
)

func GuidesRoutes(appConfig *internal.AppConfig) []authulamodels.Route {
	RegisterGuidesOpenAPIDocs(appConfig.OpenAPIService, appConfig.BasePath)

	bunGuidesRepo := guidesrepositories.NewBunGuidesRepository(appConfig.DB)
	bunStarredGuidesRepo := starredguidesrepositories.NewBunStarredGuidesRepository(appConfig.DB)
	bunStepsRepo := stepsrepositories.NewBunStepsRepository(appConfig.DB)
	bunGuideExportsRepo := guideexportrepositories.NewBunGuideExportsRepository(appConfig.DB)
	guidesCache := guidesservices.NewRedisGuidesCache(appConfig.RedisClient)
	guidesService := guidesservices.NewGuidesService(bunGuidesRepo, bunStarredGuidesRepo, guidesCache, bunStepsRepo, appConfig.RedisClient)

	starredGuidesService := starredguidesservices.NewStarredGuidesService(bunStarredGuidesRepo)

	storageService := storage.NewS3StorageService(appConfig.S3Client)
	presignService := presign.NewAWSPresignService(appConfig.S3Client, 24*time.Hour)
	exportService := export.NewExportService(
		bunGuideExportsRepo,
		bunGuidesRepo,
		bunStepsRepo,
		storageService,
		presignService,
		appConfig.RedisClient,
		appConfig.S3Bucket,
	)

	createHandler := guides.NewCreateGuideHandler(appConfig, guidesService)
	getAllHandler := guides.NewGetAllGuidesHandler(appConfig, guidesService)
	getByIDHandler := guides.NewGetGuideByIDHandler(appConfig, guidesService)
	updateHandler := guides.NewUpdateGuideHandler(appConfig, guidesService)
	deleteHandler := guides.NewDeleteGuideHandler(appConfig, guidesService)
	publishHandler := guides.NewPublishGuideHandler(appConfig, guidesService)
	unpublishHandler := guides.NewUnpublishGuideHandler(appConfig, guidesService)
	archiveHandler := guides.NewArchiveGuideHandler(appConfig, guidesService)
	unarchiveHandler := guides.NewUnarchiveGuideHandler(appConfig, guidesService)
	restoreHandler := guides.NewRestoreGuideHandler(appConfig, guidesService)
	permanentlyDeleteHandler := guides.NewPermanentlyDeleteGuideHandler(appConfig, guidesService)
	getGuidesCountHandler := guides.NewGetGuidesCountHandler(appConfig, guidesService)
	getStarredGuidesHandler := guides.NewGetStarredGuidesHandler(appConfig, starredGuidesService)
	starGuideHandler := guides.NewStarGuideHandler(appConfig, starredGuidesService)
	unstarGuideHandler := guides.NewUnstarGuideHandler(appConfig, starredGuidesService)
	recalculateDurationHandler := guides.NewRecalculateDurationHandler(appConfig, guidesService)
	exportGuideHandler := guides.NewExportGuideHandler(appConfig, exportService)
	getExportStatusHandler := guides.NewGetExportStatusHandler(appConfig, exportService)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/count", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getGuidesCountHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/{id}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/guides/{id}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/publish", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    publishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unpublish", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    unpublishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/recalculate-duration", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    recalculateDurationHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/archive", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    archiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unarchive", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    unarchiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/restore", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    restoreHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/permanently-delete", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    permanentlyDeleteHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/starred", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getStarredGuidesHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/star", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    starGuideHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}/star", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    unstarGuideHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/export", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    exportGuideHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guide-exports/{exportID}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getExportStatusHandler.Handle(),
		},
	}
}

func RegisterGuidesOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides", basePath),
		openapi.WithOperationID("createGuide"),
		openapi.WithSummary("Create guide"),
		openapi.WithDescription("Creates a new guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.CreateGuideRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides", basePath),
		openapi.WithOperationID("getAllGuides"),
		openapi.WithSummary("Get all guides"),
		openapi.WithDescription("Get all guides for a user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideStatus{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllGuidesResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/count", basePath),
		openapi.WithOperationID("getGuidesCount"),
		openapi.WithSummary("Get guides count"),
		openapi.WithDescription("Returns the total count of non-deleted guides for the authenticated user"),
		openapi.WithTags("Guides"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetGuidesCountResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/{id}", basePath),
		openapi.WithOperationID("getGuideById"),
		openapi.WithSummary("Get guide by ID"),
		openapi.WithDescription("Retrieves a single guide by its ID"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetGuideByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/guides/{id}", basePath),
		openapi.WithOperationID("updateGuide"),
		openapi.WithSummary("Update guide"),
		openapi.WithDescription("Updates an existing guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithRequest(&types.UpdateGuideRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UpdateGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/guides/{id}", basePath),
		openapi.WithOperationID("deleteGuide"),
		openapi.WithSummary("Delete guide"),
		openapi.WithDescription("Soft-deletes a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/publish", basePath),
		openapi.WithOperationID("publishGuide"),
		openapi.WithSummary("Publish guide"),
		openapi.WithDescription("Publishes a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PublishGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/unpublish", basePath),
		openapi.WithOperationID("unpublishGuide"),
		openapi.WithSummary("Unpublish guide"),
		openapi.WithDescription("Unpublishes a guide and returns it to draft status"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnpublishGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/recalculate-duration", basePath),
		openapi.WithOperationID("recalculateGuideDuration"),
		openapi.WithSummary("Recalculate guide duration"),
		openapi.WithDescription("Recalculates the synthetic duration for a guide based on its steps"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.RecalculateDurationResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/archive", basePath),
		openapi.WithOperationID("archiveGuide"),
		openapi.WithSummary("Archive guide"),
		openapi.WithDescription("Archives a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ArchiveGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/unarchive", basePath),
		openapi.WithOperationID("unarchiveGuide"),
		openapi.WithSummary("Unarchive guide"),
		openapi.WithDescription("Unarchives a guide and returns it to draft status"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnarchiveGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/restore", basePath),
		openapi.WithOperationID("restoreGuide"),
		openapi.WithSummary("Restore guide"),
		openapi.WithDescription("Restores a previously deleted guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.RestoreGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/permanently-delete", basePath),
		openapi.WithOperationID("permanentlyDeleteGuide"),
		openapi.WithSummary("Permanently delete guide"),
		openapi.WithDescription("Permanently deletes a soft-deleted guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PermanentlyDeleteGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/starred", basePath),
		openapi.WithOperationID("getStarredGuides"),
		openapi.WithSummary("Get starred guides"),
		openapi.WithDescription("Get all guides starred by the current user"),
		openapi.WithTags("Guides"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllGuidesResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/star", basePath),
		openapi.WithOperationID("starGuide"),
		openapi.WithSummary("Star guide"),
		openapi.WithDescription("Stars a guide for the current user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.StarGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/guides/{id}/star", basePath),
		openapi.WithOperationID("unstarGuide"),
		openapi.WithSummary("Unstar guide"),
		openapi.WithDescription("Unstars a guide for the current user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnstarGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/export", basePath),
		openapi.WithOperationID("exportGuide"),
		openapi.WithSummary("Export guide"),
		openapi.WithDescription("Triggers an async export of a guide (e.g. PDF)"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithRequest(&types.ExportGuideRequest{}),
		openapi.WithResponseStatus(http.StatusAccepted, &types.ExportGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guide-exports/{exportID}", basePath),
		openapi.WithOperationID("getExportStatus"),
		openapi.WithSummary("Get export status"),
		openapi.WithDescription("Polls the status of a guide export"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideExportID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetExportStatusResponse{}),
	)
}
