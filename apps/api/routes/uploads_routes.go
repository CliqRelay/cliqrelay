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

func UploadRoutes(cfg *config.HTTPConfig, uploadUseCase interfaces.UploadsUseCase) []authulamodels.Route {
	presignUploadHandler := handlersuploads.NewPresignUploadHandler(uploadUseCase)
	replaceUploadHandler := handlersuploads.NewReplaceUploadHandler(uploadUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := cfg.BasePath

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/presign", base),
			Middleware: authMiddleware,
			Handler:    presignUploadHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/replace", base),
			Middleware: authMiddleware,
			Handler:    replaceUploadHandler.Handle(),
		},
	}
}

func RegisterUploadsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	_ = svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/uploads/presign", basePath),
		openapi.WithOperationID("presignUpload"),
		openapi.WithSummary("Presign upload URL"),
		openapi.WithDescription("Generates a presigned S3 URL for uploading a screenshot"),
		openapi.WithTags("Uploads"),
		openapi.WithRequest(&types.PresignUploadRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.PresignUploadResponse{}),
	)
	_ = svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/uploads/replace", basePath),
		openapi.WithOperationID("replaceUpload"),
		openapi.WithSummary("Replace upload"),
		openapi.WithDescription("Replaces the step's media asset with the uploaded file and queues the old file for deletion"),
		openapi.WithTags("Uploads"),
		openapi.WithRequest(&types.ReplaceUploadRequest{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ReplaceUploadResponse{}),
	)
}
