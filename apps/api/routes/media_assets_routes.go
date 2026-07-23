package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	handlersmediaassets "github.com/CliqRelay/cliqrelay/handlers/media_assets"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func MediaAssetsRoutes(appConfig *config.AppConfig, mediaUseCase interfaces.MediaAssetsUseCase) []authulamodels.Route {
	createHandler := handlersmediaassets.NewCreateMediaAssetHandler(appConfig, mediaUseCase)
	getAllHandler := handlersmediaassets.NewGetAllMediaAssetsHandler(appConfig, mediaUseCase)
	getByIDHandler := handlersmediaassets.NewGetMediaAssetByIDHandler(appConfig, mediaUseCase)
	updateHandler := handlersmediaassets.NewUpdateMediaAssetHandler(appConfig, mediaUseCase)
	deleteHandler := handlersmediaassets.NewDeleteMediaAssetHandler(appConfig, mediaUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := appConfig.BasePath

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/media-assets", base),
			Middleware: authMiddleware,
			Handler:    createHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/media-assets", base),
			Middleware: authMiddleware,
			Handler:    getAllHandler.Handle(),
		},
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/media-assets/{id}", base),
			Middleware: authMiddleware,
			Handler:    getByIDHandler.Handle(),
		},
		{
			Method:     "PATCH",
			Path:       fmt.Sprintf("%s/media-assets/{id}", base),
			Middleware: authMiddleware,
			Handler:    updateHandler.Handle(),
		},
		{
			Method:     "DELETE",
			Path:       fmt.Sprintf("%s/media-assets/{id}", base),
			Middleware: authMiddleware,
			Handler:    deleteHandler.Handle(),
		},
	}
}

func RegisterMediaAssetsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/media-assets", basePath),
		openapi.WithOperationID("createMediaAsset"),
		openapi.WithSummary("Create media asset"),
		openapi.WithDescription("Creates a new media asset associated with a step"),
		openapi.WithTags("Media Assets"),
		openapi.WithRequest(&types.CreateMediaAssetRequest{}),
		openapi.WithResponseStatus(http.StatusCreated, &types.CreateMediaAssetResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/media-assets", basePath),
		openapi.WithOperationID("getAllMediaAssetsByStepId"),
		openapi.WithSummary("Get all media assets by step ID"),
		openapi.WithDescription("Retrieves all media assets for a given step"),
		openapi.WithTags("Media Assets"),
		openapi.WithRequest(&types.GetAllMediaAssetsQuery{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetAllMediaAssetsResponse{}),
	)

	svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/media-assets/{id}", basePath),
		openapi.WithOperationID("getMediaAssetById"),
		openapi.WithSummary("Get media asset by ID"),
		openapi.WithDescription("Retrieves a single media asset by its ID"),
		openapi.WithTags("Media Assets"),
		openapi.WithRequest(&types.MediaAssetID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.GetMediaAssetByIDResponse{}),
	)

	svc.AddOperation(
		http.MethodPatch,
		fmt.Sprintf("%s/media-assets/{id}", basePath),
		openapi.WithOperationID("updateMediaAsset"),
		openapi.WithSummary("Update media asset"),
		openapi.WithDescription("Updates an existing media asset's metadata"),
		openapi.WithTags("Media Assets"),
		openapi.WithRequest(&types.MediaAssetID{}),
		openapi.WithRequest(&types.UpdateMediaAssetRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.UpdateMediaAssetResponse{}),
	)

	svc.AddOperation(
		http.MethodDelete,
		fmt.Sprintf("%s/media-assets/{id}", basePath),
		openapi.WithOperationID("deleteMediaAsset"),
		openapi.WithSummary("Delete media asset"),
		openapi.WithDescription("Hard-deletes a media asset"),
		openapi.WithTags("Media Assets"),
		openapi.WithRequest(&types.MediaAssetID{}),
		openapi.WithResponseStatus(http.StatusOK, &types.DeleteMediaAssetResponse{}),
	)
}
