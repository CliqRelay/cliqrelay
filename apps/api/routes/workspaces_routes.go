package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	handlersworkspaces "github.com/CliqRelay/cliqrelay/handlers/workspaces"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func WorkspacesRoutes(appConfig *config.AppConfig, workspaceSvc interfaces.WorkspaceService) []authulamodels.Route {
	createHandler := handlersworkspaces.NewCreateWorkspaceHandler(appConfig, workspaceSvc)
	getAllHandler := handlersworkspaces.NewGetAllWorkspacesHandler(appConfig, workspaceSvc)
	getByIDHandler := handlersworkspaces.NewGetWorkspaceByIDHandler(appConfig, workspaceSvc)
	updateHandler := handlersworkspaces.NewUpdateWorkspaceHandler(appConfig, workspaceSvc)
	deleteHandler := handlersworkspaces.NewDeleteWorkspaceHandler(appConfig, workspaceSvc)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/workspaces", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/workspaces", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/workspaces/{workspaceId}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/workspaces/{workspaceId}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/workspaces/{workspaceId}", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
	}
}

func RegisterWorkspacesOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/workspaces", basePath),
		openapi.WithOperationID("createWorkspace"),
		openapi.WithSummary("Create workspace"),
		openapi.WithDescription("Creates a new workspace"),
		openapi.WithTags("Workspaces"),
		openapi.WithRequest(&types.CreateWorkspaceRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateWorkspaceResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/workspaces", basePath),
		openapi.WithOperationID("getWorkspaces"),
		openapi.WithSummary("Get all workspaces"),
		openapi.WithDescription("Get all workspaces for the authenticated user"),
		openapi.WithTags("Workspaces"),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllWorkspacesResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/workspaces/{workspaceId}", basePath),
		openapi.WithOperationID("getWorkspaceById"),
		openapi.WithSummary("Get workspace by ID"),
		openapi.WithDescription("Retrieves a single workspace by its ID"),
		openapi.WithTags("Workspaces"),
		openapi.WithRequest(&types.WorkspaceID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetWorkspaceByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/workspaces/{workspaceId}", basePath),
		openapi.WithOperationID("updateWorkspace"),
		openapi.WithSummary("Update workspace"),
		openapi.WithDescription("Updates an existing workspace"),
		openapi.WithTags("Workspaces"),
		openapi.WithRequest(&types.WorkspaceID{}),
		openapi.WithRequest(&types.UpdateWorkspaceRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UpdateWorkspaceResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/workspaces/{workspaceId}", basePath),
		openapi.WithOperationID("deleteWorkspace"),
		openapi.WithSummary("Delete workspace"),
		openapi.WithDescription("Deletes a workspace"),
		openapi.WithTags("Workspaces"),
		openapi.WithRequest(&types.WorkspaceID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteWorkspaceResponse{}),
	)
}
