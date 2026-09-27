package routes

import (
	"fmt"
	"net/http"

	authulamiddleware "github.com/Authula/authula/middleware"
	authulamodels "github.com/Authula/authula/models"
	orgtypes "github.com/Authula/authula/plugins/organizations/types"

	"github.com/CliqRelay/cliqrelay/config"
	"github.com/CliqRelay/cliqrelay/handlers/organizations"
	"github.com/CliqRelay/cliqrelay/interfaces"
	"github.com/CliqRelay/cliqrelay/openapi"
	"github.com/CliqRelay/cliqrelay/types"
)

func OrganizationsRoutes(cfg *config.HTTPConfig, organizationsUseCase interfaces.OrganizationsUseCase) []authulamodels.Route {
	getMyMembershipHandler := organizations.NewGetMyMembershipHandler(organizationsUseCase)

	authMiddleware := []func(http.Handler) http.Handler{
		authulamiddleware.RequireActor(authulamodels.ActorUser),
	}

	return []authulamodels.Route{
		{
			Method:     "GET",
			Path:       fmt.Sprintf("%s/organizations/{org_id}/members/me", cfg.BasePath),
			Middleware: authMiddleware,
			Handler:    getMyMembershipHandler.Handle(),
		},
	}
}

func RegisterOrganizationsOpenAPIDocs(svc openapi.OpenAPIService, basePath string) {
	_ = svc.AddOperation(
		http.MethodGet,
		fmt.Sprintf("%s/organizations/{org_id}/members/me", basePath),
		openapi.WithOperationID("getMyOrgMembership"),
		openapi.WithSummary("Get the signed-in user's organization membership."),
		openapi.WithDescription("Returns the caller's own membership row, including their role. Responds with 404 when the caller is not a member or the organization does not exist."),
		openapi.WithTags("Organizations"),
		openapi.WithRequest(&types.OrganizationIDPathParam{}),
		openapi.WithResponseStatus(http.StatusOK, &orgtypes.OrganizationMemberResponse{}),
	)
}
