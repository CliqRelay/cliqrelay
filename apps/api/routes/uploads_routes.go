package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	handlersuploads "github.com/CliqRelay/cliqrelay/handlers/uploads"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func UploadRoutes(appConfig *config.AppConfig, uploadUseCase interfaces.UploadsUseCase) []authulamodels.Route {
	presignUploadHandler := handlersuploads.NewPresignUploadHandler(appConfig, uploadUseCase)
	completeUploadHandler := handlersuploads.NewCompleteUploadHandler(appConfig, uploadUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := appConfig.BasePath

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/presign", base),
			Middleware: authMiddleware,
			Handler:    presignUploadHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/complete", base),
			Middleware: authMiddleware,
			Handler:    completeUploadHandler.Handle(),
		},
	}
}

func RegisterUploadsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/uploads/presign", basePath),
		openapi.WithOperationID("presignUpload"),
		openapi.WithSummary("Presign upload URL"),
		openapi.WithDescription("Generates a presigned S3 URL for uploading a screenshot"),
		openapi.WithTags("Uploads"),
		openapi.WithRequest(&types.PresignUploadRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PresignUploadResponse{}),
	)
	svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/uploads/complete", basePath),
		openapi.WithOperationID("completeUpload"),
		openapi.WithSummary("Complete upload"),
		openapi.WithDescription("Creates a media asset record after the upload finishes"),
		openapi.WithTags("Uploads"),
		openapi.WithRequest(&types.CompleteUploadRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.CompleteUploadResponse{}),
	)
}
