package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	activitylogs "github.com/CliqRelay/cliqrelay/handlers/activity_logs"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func ActivityLogsRoutes(cfg *config.HTTPConfig, activityLogsUseCase interfaces.ActivityLogsUseCase) []authulamodels.Route {
	listHandler := activitylogs.NewListActivityLogsHandler(activityLogsUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	base := cfg.BasePath

	return []authulamodels.Route{
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/activity-logs", base),
			Middleware: authMiddleware,
			Handler:    listHandler.Handle(),
		},
	}
}

func RegisterActivityLogsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	_ = svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/activity-logs", basePath),
		openapi.WithOperationID("listActivityLogs"),
		openapi.WithSummary("List activity logs"),
		openapi.WithDescription("Returns the most recent activity for a team, newest first"),
		openapi.WithTags("Activity Logs"),
		openapi.WithRequest(&types.ListActivityLogsQueryParams{}),
		openapi.WithResponseStatus(http.StatusOK, &types.ListActivityLogsResponse{}),
	)
}
