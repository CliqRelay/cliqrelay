package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/steps"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func StepsRoutes(appConfig *config.AppConfig, stepsSvc interfaces.StepsService) []authulamodels.Route {
	stepsService := stepsSvc

	createHandler := steps.NewCreateStepHandler(appConfig, stepsService)
	getAllHandler := steps.NewGetAllStepsHandler(appConfig, stepsService)
	getByIDHandler := steps.NewGetStepByIDHandler(appConfig, stepsService)
	updateHandler := steps.NewUpdateStepHandler(appConfig, stepsService)
	deleteHandler := steps.NewDeleteStepHandler(appConfig, stepsService)
	reorderHandler := steps.NewReorderStepsHandler(appConfig, stepsService)
	duplicateHandler := steps.NewDuplicateStepHandler(appConfig, stepsService)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	ws := fmt.Sprintf("%s/workspaces/{workspaceId}", appConfig.BasePath)

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps", ws),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps", ws),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps/{id}/duplicate", ws),
			Middleware: authMiddleware,
			Handler:    duplicateHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/guides/{guideId}/steps/reorder", ws),
			Middleware: authMiddleware,
			Handler:    reorderHandler.Handle(),
		},
	}
}

func RegisterStepsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	ws := fmt.Sprintf("%s/workspaces/{workspaceId}", basePath)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{guideId}/steps", ws),
		openapi.WithOperationID("createStep"),
		openapi.WithSummary("Create step"),
		openapi.WithDescription("Creates a new step within a guide"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.CreateStepRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateStepResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/{guideId}/steps", ws),
		openapi.WithOperationID("getAllStepsByGuideId"),
		openapi.WithSummary("Get all steps by guide ID"),
		openapi.WithDescription("Retrieves all steps for a given guide, ordered by sort_order"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepsByGuideIDQuery{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllStepsResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
		openapi.WithOperationID("getStepById"),
		openapi.WithSummary("Get step by ID"),
		openapi.WithDescription("Retrieves a single step by its ID"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetStepByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
		openapi.WithOperationID("updateStep"),
		openapi.WithSummary("Update step"),
		openapi.WithDescription("Updates an existing step"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithRequest(&types.UpdateStepRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UpdateStepResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/guides/{guideId}/steps/{id}", ws),
		openapi.WithOperationID("deleteStep"),
		openapi.WithSummary("Delete step"),
		openapi.WithDescription("Hard-deletes a step"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteStepResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{guideId}/steps/{id}/duplicate", ws),
		openapi.WithOperationID("duplicateStep"),
		openapi.WithSummary("Duplicate step"),
		openapi.WithDescription("Duplicates a step including its media assets"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithRequest(&types.DuplicateStepRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.DuplicateStepResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/guides/{guideId}/steps/reorder", ws),
		openapi.WithOperationID("reorderSteps"),
		openapi.WithSummary("Reorder steps"),
		openapi.WithDescription("Reorders steps within a guide"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.ReorderStepsRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ReorderStepsResponse{}),
	)
}
