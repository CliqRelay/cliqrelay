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

func StepsRoutes(appConfig *config.AppConfig, stepsUseCase interfaces.StepsUseCase) []authulamodels.Route {
	createHandler := steps.NewCreateStepHandler(appConfig, stepsUseCase)
	getAllHandler := steps.NewGetAllStepsHandler(appConfig, stepsUseCase)
	getByIDHandler := steps.NewGetStepByIDHandler(appConfig, stepsUseCase)
	updateHandler := steps.NewUpdateStepHandler(appConfig, stepsUseCase)
	deleteHandler := steps.NewDeleteStepHandler(appConfig, stepsUseCase)
	reorderHandler := steps.NewReorderStepsHandler(appConfig, stepsUseCase)
	duplicateHandler := steps.NewDuplicateStepHandler(appConfig, stepsUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := appConfig.BasePath

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/steps", base),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/steps", base),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/steps/reorder", base),
			Middleware: authMiddleware,
			Handler:    reorderHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/steps/{id}", base),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/steps/{id}", base),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/steps/{id}", base),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/steps/{id}/duplicate", base),
			Middleware: authMiddleware,
			Handler:    duplicateHandler.Handle(),
		},
	}
}

func RegisterStepsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/steps", basePath),
		openapi.WithOperationID("createStep"),
		openapi.WithSummary("Create step"),
		openapi.WithDescription("Creates a new step within a guide"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.CreateStepRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateStepResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/steps", basePath),
		openapi.WithOperationID("getAllStepsByGuideId"),
		openapi.WithSummary("Get all steps by guide ID"),
		openapi.WithDescription("Retrieves all steps for a given guide, ordered by sort_order"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepsByGuideIDQuery{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllStepsResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/steps/{id}", basePath),
		openapi.WithOperationID("getStepById"),
		openapi.WithSummary("Get step by ID"),
		openapi.WithDescription("Retrieves a single step by its ID"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetStepByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/steps/{id}", basePath),
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
		fmt.Sprintf("%s/steps/{id}", basePath),
		openapi.WithOperationID("deleteStep"),
		openapi.WithSummary("Delete step"),
		openapi.WithDescription("Hard-deletes a step"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.StepID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteStepResponse{}),
	)

	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/steps/{id}/duplicate", basePath),
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
		fmt.Sprintf("%s/steps/reorder", basePath),
		openapi.WithOperationID("reorderSteps"),
		openapi.WithSummary("Reorder steps"),
		openapi.WithDescription("Reorders steps within a guide"),
		openapi.WithTags("Steps"),
		openapi.WithRequest(&types.ReorderStepsRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ReorderStepsResponse{}),
	)
}
