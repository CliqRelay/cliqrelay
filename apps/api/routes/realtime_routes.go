package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/realtime"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

// RealtimeStreamPath is relative to the API base path.
const RealtimeStreamPath = "/realtime/stream"

func RealtimeRoutes(cfg *config.HTTPConfig, realtimeUseCase interfaces.RealtimeUseCase) []authulamodels.Route {
	connectHandler := realtime.NewConnectHandler(realtimeUseCase)

	return []authulamodels.Route{
		{
			Method:     "POST",
			Path:       fmt.Sprintf("%s/realtime/connect", cfg.BasePath),
			Middleware: []func(http.Handler) http.Handler{authulamiddleware.RequireActor(authulamodels.ActorUser)},
			Handler:    connectHandler.Handle(),
		},
	}
}

func RealtimeRawRoutes(cfg *config.HTTPConfig, realtimeUseCase interfaces.RealtimeUseCase, allowedOrigin string) []RawRoute {
	return []RawRoute{
		{
			Method:  http.MethodGet,
			Path:    cfg.BasePath + RealtimeStreamPath,
			Handler: realtime.NewStreamHandler(realtimeUseCase, allowedOrigin),
		},
	}
}

func RegisterRealtimeOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	_ = svc.AddOperation(
		http.MethodPost,
		fmt.Sprintf("%s/realtime/connect", basePath),
		openapi.WithOperationID("connectRealtime"),
		openapi.WithSummary("Connect to realtime events"),
		openapi.WithDescription("Returns a short-lived, single-use URL for opening the team's realtime event stream"),
		openapi.WithTags("Realtime"),
		openapi.WithRequest(&types.ConnectRealtimeQueryParams{}),
		openapi.WithResponseStatus(http.StatusOK, &types.RealtimeConnectionResponse{}),
	)
}
