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

func GuidesRoutes(appConfig *config.AppConfig, guidesSvc interfaces.GuidesService, starredSvc interfaces.StarredGuidesService, exportSvc interfaces.ExportService) []authulamodels.Route {
	createHandler := guides.NewCreateGuideHandler(appConfig, guidesSvc)
	getAllHandler := guides.NewGetAllGuidesHandler(appConfig, guidesSvc)
	getByIDHandler := guides.NewGetGuideByIDHandler(appConfig, guidesSvc)
	updateHandler := guides.NewUpdateGuideHandler(appConfig, guidesSvc)
	deleteHandler := guides.NewDeleteGuideHandler(appConfig, guidesSvc)
	publishHandler := guides.NewPublishGuideHandler(appConfig, guidesSvc)
	unpublishHandler := guides.NewUnpublishGuideHandler(appConfig, guidesSvc)
	archiveHandler := guides.NewArchiveGuideHandler(appConfig, guidesSvc)
	unarchiveHandler := guides.NewUnarchiveGuideHandler(appConfig, guidesSvc)
	restoreHandler := guides.NewRestoreGuideHandler(appConfig, guidesSvc)
	permanentlyDeleteHandler := guides.NewPermanentlyDeleteGuideHandler(appConfig, guidesSvc)
	getGuidesCountHandler := guides.NewGetGuidesCountHandler(appConfig, guidesSvc)
	getStarredGuidesHandler := guides.NewGetStarredGuidesHandler(appConfig, starredSvc)
	starGuideHandler := guides.NewStarGuideHandler(appConfig, starredSvc)
	unstarGuideHandler := guides.NewUnstarGuideHandler(appConfig, starredSvc)
	recalculateDurationHandler := guides.NewRecalculateDurationHandler(appConfig, guidesSvc)
	exportGuideHandler := guides.NewExportGuideHandler(appConfig, exportSvc)
	getExportStatusHandler := guides.NewGetExportStatusHandler(appConfig, exportSvc)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := appConfig.BasePath
	ws := fmt.Sprintf("%s/workspaces/{workspaceId}", base)

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides", ws),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides", ws),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/count", ws),
			Middleware: authMiddleware,
			Handler:    getGuidesCountHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/{id}", ws),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/guides/{id}", ws),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}", ws),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/publish", ws),
			Middleware: authMiddleware,
			Handler:    publishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unpublish", ws),
			Middleware: authMiddleware,
			Handler:    unpublishHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/recalculate-duration", ws),
			Middleware: authMiddleware,
			Handler:    recalculateDurationHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/archive", ws),
			Middleware: authMiddleware,
			Handler:    archiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/unarchive", ws),
			Middleware: authMiddleware,
			Handler:    unarchiveHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/restore", ws),
			Middleware: authMiddleware,
			Handler:    restoreHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/permanently-delete", ws),
			Middleware: authMiddleware,
			Handler:    permanentlyDeleteHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/starred", ws),
			Middleware: authMiddleware,
			Handler:    getStarredGuidesHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/star", ws),
			Middleware: authMiddleware,
			Handler:    starGuideHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{id}/star", ws),
			Middleware: authMiddleware,
			Handler:    unstarGuideHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{id}/export", ws),
			Middleware: authMiddleware,
			Handler:    exportGuideHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guide-exports/{exportID}", ws),
			Middleware: authMiddleware,
			Handler:    getExportStatusHandler.Handle(),
		},
	}
}

func RegisterGuidesOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	ws := fmt.Sprintf("%s/workspaces/{workspaceId}", basePath)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides", ws),
		openapi.WithOperationID("createGuide"),
		openapi.WithSummary("Create guide"),
		openapi.WithDescription("Creates a new guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.CreateGuideRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides", ws),
		openapi.WithOperationID("getAllGuides"),
		openapi.WithSummary("Get all guides"),
		openapi.WithDescription("Get all guides for a user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideStatus{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllGuidesResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/count", ws),
		openapi.WithOperationID("getGuidesCount"),
		openapi.WithSummary("Get guides count"),
		openapi.WithDescription("Returns the total count of non-deleted guides for the authenticated user"),
		openapi.WithTags("Guides"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetGuidesCountResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/{id}", ws),
		openapi.WithOperationID("getGuideById"),
		openapi.WithSummary("Get guide by ID"),
		openapi.WithDescription("Retrieves a single guide by its ID"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetGuideByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/guides/{id}", ws),
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
		fmt.Sprintf("%s/guides/{id}", ws),
		openapi.WithOperationID("deleteGuide"),
		openapi.WithSummary("Delete guide"),
		openapi.WithDescription("Soft-deletes a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/publish", ws),
		openapi.WithOperationID("publishGuide"),
		openapi.WithSummary("Publish guide"),
		openapi.WithDescription("Publishes a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PublishGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/unpublish", ws),
		openapi.WithOperationID("unpublishGuide"),
		openapi.WithSummary("Unpublish guide"),
		openapi.WithDescription("Unpublishes a guide and returns it to draft status"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnpublishGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/recalculate-duration", ws),
		openapi.WithOperationID("recalculateGuideDuration"),
		openapi.WithSummary("Recalculate guide duration"),
		openapi.WithDescription("Recalculates the synthetic duration for a guide based on its steps"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.RecalculateDurationResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/archive", ws),
		openapi.WithOperationID("archiveGuide"),
		openapi.WithSummary("Archive guide"),
		openapi.WithDescription("Archives a guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ArchiveGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/unarchive", ws),
		openapi.WithOperationID("unarchiveGuide"),
		openapi.WithSummary("Unarchive guide"),
		openapi.WithDescription("Unarchives a guide and returns it to draft status"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnarchiveGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/restore", ws),
		openapi.WithOperationID("restoreGuide"),
		openapi.WithSummary("Restore guide"),
		openapi.WithDescription("Restores a previously deleted guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.RestoreGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/permanently-delete", ws),
		openapi.WithOperationID("permanentlyDeleteGuide"),
		openapi.WithSummary("Permanently delete guide"),
		openapi.WithDescription("Permanently deletes a soft-deleted guide"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PermanentlyDeleteGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/starred", ws),
		openapi.WithOperationID("getStarredGuides"),
		openapi.WithSummary("Get starred guides"),
		openapi.WithDescription("Get all guides starred by the current user"),
		openapi.WithTags("Guides"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllGuidesResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/star", ws),
		openapi.WithOperationID("starGuide"),
		openapi.WithSummary("Star guide"),
		openapi.WithDescription("Stars a guide for the current user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.StarGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/guides/{id}/star", ws),
		openapi.WithOperationID("unstarGuide"),
		openapi.WithSummary("Unstar guide"),
		openapi.WithDescription("Unstars a guide for the current user"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UnstarGuideResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{id}/export", ws),
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
		fmt.Sprintf("%s/guide-exports/{exportID}", ws),
		openapi.WithOperationID("getExportStatus"),
		openapi.WithSummary("Get export status"),
		openapi.WithDescription("Polls the status of a guide export"),
		openapi.WithTags("Guides"),
		openapi.WithRequest(&types.GuideExportID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetExportStatusResponse{}),
	)
}
