package routes

import (
	"fmt"
	"net/http"
	"time"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	handlersuploads "github.com/CliqRelay/cliqrelay/handlers/uploads"
	"github.com/CliqRelay/cliqrelay/openapi"
	guidesrepositories "github.com/CliqRelay/cliqrelay/repositories/guides"
	mediaassetsrepositories "github.com/CliqRelay/cliqrelay/repositories/media_assets"
	stepsrepositories "github.com/CliqRelay/cliqrelay/repositories/steps"
	"github.com/CliqRelay/cliqrelay/services/presign"
	uploadsservice "github.com/CliqRelay/cliqrelay/services/uploads"
	"github.com/CliqRelay/cliqrelay/types"
)

func UploadRoutes(appConfig *config.AppConfig) []authulamodels.Route {
	RegisterUploadsOpenAPIDocs(appConfig.OpenAPIService, appConfig.BasePath)

	bunGuidesRepo := guidesrepositories.NewBunGuidesRepository(appConfig.DB)
	bunStepsRepo := stepsrepositories.NewBunStepsRepository(appConfig.DB)
	bunMediaAssetsRepo := mediaassetsrepositories.NewBunMediaAssetsRepository(appConfig.DB)

	expiry, _ := time.ParseDuration(appConfig.EnvConfig.S3PresignedURLExpiry)

	presignClient := presign.NewAWSPresignService(appConfig.S3Client, expiry)

	uploadsSvc := uploadsservice.NewUploadsService(
		bunGuidesRepo,
		bunStepsRepo,
		bunMediaAssetsRepo,
		presignClient,
		appConfig.S3Bucket,
	)

	presignUploadHandler := handlersuploads.NewPresignUploadHandler(appConfig, uploadsSvc)
	completeUploadHandler := handlersuploads.NewCompleteUploadHandler(appConfig, uploadsSvc)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/presign", appConfig.BasePath),
			Middleware: authMiddleware,
			Handler:    presignUploadHandler.Handle(),
		},
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/uploads/complete", appConfig.BasePath),
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
