package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/guides"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func GuidesRoutes(appConfig *config.AppConfig, guidesUseCase interfaces.GuidesUseCase, exportSvc interfaces.ExportService) []authulamodels.Route {
	createHandler := guides.NewCreateGuideHandler(appConfig, guidesUseCase)
	createDemoGuideHandler := guides.NewCreateDemoGuideHandler(appConfig, guidesUseCase)
	getAllHandler := guides.NewGetAllGuidesHandler(appConfig, guidesUseCase)
	getByIDHandler := guides.NewGetGuideByIDHandler(appConfig, guidesUseCase)
	updateHandler := guides.NewUpdateGuideHandler(appConfig, guidesUseCase)
	deleteHandler := guides.NewDeleteGuideHandler(appConfig, guidesUseCase)
	publishHandler := guides.NewPublishGuideHandler(appConfig, guidesUseCase)
	unpublishHandler := guides.NewUnpublishGuideHandler(appConfig, guidesUseCase)
	archiveHandler := guides.NewArchiveGuideHandler(appConfig, guidesUseCase)
	unarchiveHandler := guides.NewUnarchiveGuideHandler(appConfig, guidesUseCase)
	restoreHandler := guides.NewRestoreGuideHandler(appConfig, guidesUseCase)
	permanentlyDeleteHandler := guides.NewPermanentlyDeleteGuideHandler(appConfig, guidesUseCase)
	getGuidesCountHandler := guides.NewGetGuidesCountHandler(appConfig, guidesUseCase)
	getStarredGuidesHandler := guides.NewGetStarredGuidesHandler(appConfig, guidesUseCase)
	starGuideHandler := guides.NewStarGuideHandler(appConfig, guidesUseCase)
	unstarGuideHandler := guides.NewUnstarGuideHandler(appConfig, guidesUseCase)
	recalculateDurationHandler := guides.NewRecalculateDurationHandler(appConfig, guidesUseCase)
	exportGuideHandler := guides.NewExportGuideHandler(appConfig, exportSvc)
	getExportStatusHandler := guides.NewGetExportStatusHandler(appConfig, exportSvc)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := appConfig.BasePath

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/demo", base),
			Middleware: authMiddleware,
			Handler:    createDemoGuideHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides", base),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides", base),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/count", base),
			Middleware: authMiddleware,
			Handler:    getGuidesCountHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/starred", base),
			Middleware: authMiddleware,
			Handler:    getStarredGuidesHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/{id}", base),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/guides/{id}", base),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}", base),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/publish", base),
			Middleware: authMiddleware,
			Handler:    publishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unpublish", base),
			Middleware: authMiddleware,
			Handler:    unpublishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/recalculate-duration", base),
			Middleware: authMiddleware,
			Handler:    recalculateDurationHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/archive", base),
			Middleware: authMiddleware,
			Handler:    archiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unarchive", base),
			Middleware: authMiddleware,
			Handler:    unarchiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/restore", base),
			Middleware: authMiddleware,
			Handler:    restoreHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/permanently-delete", base),
			Middleware: authMiddleware,
			Handler:    permanentlyDeleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/star", base),
			Middleware: authMiddleware,
			Handler:    starGuideHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}/star", base),
			Middleware: authMiddleware,
			Handler:    unstarGuideHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/export", base),
			Middleware: authMiddleware,
			Handler:    exportGuideHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guide-exports/{exportID}", base),
			Middleware: authMiddleware,
			Handler:    getExportStatusHandler.Handle(),
		},
	}
}

func RegisterGuidesOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/demo", basePath),
		openapi.WithOperationID("createDemoGuide"),
		openapi.WithSummary("Create demo guide"),
		openapi.WithDescription("Creates a demo guide with predefined steps"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.CreateDemoGuideRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateDemoGuideResponse{}),
	)

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
		openapi.WithRequest(&types.GuideQueryParams{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllGuidesResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/count", basePath),
		openapi.WithOperationID("getGuidesCount"),
		openapi.WithSummary("Get guides count"),
		openapi.WithDescription("Returns the total count of non-deleted guides for the authenticated user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(types.WorkspaceIDQueryParam{}),
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
		openapi.WithRequest(types.WorkspaceIDQueryParam{}),
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
