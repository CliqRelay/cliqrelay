package auth

import (
	"fmt"
	"time"

	"github.com/Authula/authula"
	authulaconfig "github.com/Authula/authula/config"
	authulaevents "github.com/Authula/authula/events"
	authulamodels "github.com/Authula/authula/models"

	accesscontrolplugin "github.com/Authula/authula/plugins/access-control"
	accesscontrolplugintypes "github.com/Authula/authula/plugins/access-control/types"
	csrfplugin "github.com/Authula/authula/plugins/csrf"
	emailplugin "github.com/Authula/authula/plugins/email"
	emailpasswordplugin "github.com/Authula/authula/plugins/email-password"
	emailpasswordplugintypes "github.com/Authula/authula/plugins/email-password/types"
	emailplugintypes "github.com/Authula/authula/plugins/email/types"
	organizationsplugin "github.com/Authula/authula/plugins/organizations"
	organizationsplugintypes "github.com/Authula/authula/plugins/organizations/types"

	ratelimitplugin "github.com/Authula/authula/plugins/rate-limit"
	ratelimitplugintypes "github.com/Authula/authula/plugins/rate-limit/types"
	secondarystorageplugin "github.com/Authula/authula/plugins/secondary-storage"
	sessionplugin "github.com/Authula/authula/plugins/session"
	"github.com/CliqRelay/cliqrelay/constants"
)

func InitAuth(envConfig *constants.EnvConfig) *authula.Auth {
	apiBasePath := "/api/v1"

	// Init Authula Config
	config := authulaconfig.NewConfig(
		authulaconfig.WithAppName("CliqRelay"),
		authulaconfig.WithSecret(envConfig.AuthulaSecret),
		authulaconfig.WithBasePath(fmt.Sprintf("%s/auth", apiBasePath)),
		authulaconfig.WithDatabase(authulamodels.DatabaseConfig{
			Provider: "postgres",
			URL:      envConfig.DatabaseURL,
		}),
		authulaconfig.WithLogger(authulamodels.LoggerConfig{
			Level: "debug",
		}),
		authulaconfig.WithSession(authulamodels.SessionConfig{
			CookieName:         "authula.session_token",
			ExpiresIn:          24 * time.Hour,
			UpdateAge:          5 * time.Minute,
			CookieMaxAge:       24 * time.Hour,
			Secure:             false,
			HttpOnly:           true,
			SameSite:           "lax",
			MaxSessionsPerUser: 5,
			AutoCleanup:        true,
			CleanupInterval:    time.Minute,
		}),
		authulaconfig.WithVerification(authulamodels.VerificationConfig{
			AutoCleanup:     true,
			CleanupInterval: time.Minute,
		}),
		authulaconfig.WithSecurity(authulamodels.SecurityConfig{
			TrustedOrigins: []string{envConfig.ClientURL, envConfig.ExtensionURL},
			CORS: authulamodels.CORSConfig{
				AllowCredentials: true,
				AllowedOrigins:   []string{envConfig.ClientURL, envConfig.ExtensionURL},
				AllowedMethods:   []string{"OPTIONS", "GET", "POST", "PATCH", "PUT", "DELETE"},
				AllowedHeaders:   []string{"Authorization", "Content-Type", "Set-Cookie", "Cookie", "X-AUTHULA-CSRF-TOKEN"},
				ExposedHeaders:   []string{"X-AUTHULA-CSRF-TOKEN"},
				MaxAge:           24 * time.Hour,
			},
		}),
		authulaconfig.WithEventBus(authulamodels.EventBusConfig{
			Provider: authulaevents.ProviderRedis,
			Redis: &authulamodels.RedisConfig{
				URL:           envConfig.RedisURL,
				ConsumerGroup: envConfig.EventBusConsumerGroup,
			},
		}),
		authulaconfig.WithRouteMappings([]authulamodels.RouteMapping{
			// Core Routes
			{
				Paths:   []string{"GET:/me"},
				Plugins: []string{sessionplugin.HookIDSessionAuth.String()},
			},
			{
				Paths: []string{"POST:/sign-out"},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// Email-Password Routes
			{
				Paths: []string{
					"POST:/email-password/sign-in",
					"POST:/email-password/sign-up",
					"POST:/email-password/request-password-reset",
					"POST:/email-password/change-password",
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuthOptional.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			{
				Paths:   []string{"GET:/email-password/verify-email"},
				Plugins: []string{sessionplugin.HookIDSessionAuthOptional.String()},
			},
			{
				Paths: []string{
					"POST:/email-password/send-email-verification",
					"POST:/email-password/request-email-change",
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// ----------------------
			// Custom Routes
			// ----------------------
			// Health
			{
				Paths: []string{fmt.Sprintf("GET:%s/health", apiBasePath)},
			},
			// Workspaces
			{
				Paths: []string{
					fmt.Sprintf("GET:%s/workspaces", apiBasePath),
					fmt.Sprintf("GET:%s/workspaces/{workspaceId}", apiBasePath),
					fmt.Sprintf("DELETE:%s/workspaces/{workspaceId}", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
				},
			},
			{
				Paths: []string{
					fmt.Sprintf("POST:%s/workspaces", apiBasePath),
					fmt.Sprintf("PATCH:%s/workspaces/{workspaceId}", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// Guides
			{
				Paths: []string{
					fmt.Sprintf("GET:%s/guides", apiBasePath),
					fmt.Sprintf("GET:%s/guides/{id}", apiBasePath),
					fmt.Sprintf("GET:%s/guides/count", apiBasePath),
					fmt.Sprintf("GET:%s/guides/starred", apiBasePath),
					fmt.Sprintf("GET:%s/guide-exports/{exportID}", apiBasePath),
					fmt.Sprintf("DELETE:%s/guides/{id}", apiBasePath),
					fmt.Sprintf("DELETE:%s/guides/{id}/star", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
				},
			},
			{
				Paths: []string{
					fmt.Sprintf("POST:%s/guides", apiBasePath),
					fmt.Sprintf("PATCH:%s/guides/{id}", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/publish", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/unpublish", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/archive", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/unarchive", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/restore", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/permanently-delete", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/star", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/recalculate-duration", apiBasePath),
					fmt.Sprintf("POST:%s/guides/{id}/export", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// Steps
			{
				Paths: []string{
					fmt.Sprintf("GET:%s/steps", apiBasePath),
					fmt.Sprintf("GET:%s/steps/{id}", apiBasePath),
					fmt.Sprintf("DELETE:%s/steps/{id}", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
				},
			},
			{
				Paths: []string{
					fmt.Sprintf("POST:%s/steps", apiBasePath),
					fmt.Sprintf("PATCH:%s/steps/{id}", apiBasePath),
					fmt.Sprintf("POST:%s/steps/{id}/duplicate", apiBasePath),
					fmt.Sprintf("POST:%s/steps/reorder", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// Uploads
			{
				Paths: []string{
					fmt.Sprintf("POST:%s/uploads/presign", apiBasePath),
					fmt.Sprintf("POST:%s/uploads/complete", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
			// Media Assets
			{
				Paths: []string{
					fmt.Sprintf("GET:%s/media-assets", apiBasePath),
					fmt.Sprintf("GET:%s/media-assets/{id}", apiBasePath),
					fmt.Sprintf("DELETE:%s/media-assets/{id}", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
				},
			},
			{
				Paths: []string{
					fmt.Sprintf("POST:%s/media-assets", apiBasePath),
					fmt.Sprintf("PATCH:%s/media-assets/{id}", apiBasePath),
				},
				Plugins: []string{
					sessionplugin.HookIDSessionAuth.String(),
					csrfplugin.HookIDCSRFProtect.String(),
				},
			},
		}),
	)

	// Init Authula Plugins
	plugins := []authulamodels.Plugin{
		secondarystorageplugin.New(secondarystorageplugin.SecondaryStoragePluginConfig{
			Enabled:  true,
			Provider: secondarystorageplugin.SecondaryStorageProviderRedis,
			Redis: &secondarystorageplugin.RedisStorageConfig{
				URL:         envConfig.RedisURL,
				MaxRetries:  3,
				PoolSize:    10,
				PoolTimeout: 30 * time.Second,
			},
		}),
		csrfplugin.New(csrfplugin.CSRFPluginConfig{
			Enabled:    false,
			CookieName: "authula_csrf_token",
			HeaderName: "X-AUTHULA-CSRF-TOKEN",
		}),
		emailplugin.New(emailplugintypes.EmailPluginConfig{
			Enabled:     true,
			Provider:    emailplugintypes.ProviderSMTP,
			FromAddress: "noreply@example.com",
			TLSMode:     emailplugintypes.SMTPTLSModeStartTLS,
		}),
		emailpasswordplugin.New(emailpasswordplugintypes.EmailPasswordPluginConfig{
			Enabled:                     true,
			MinPasswordLength:           8,
			MaxPasswordLength:           32,
			DisableSignUp:               false,
			RequireEmailVerification:    true,
			AutoSignIn:                  true,
			SendEmailOnSignUp:           true,
			SendEmailOnSignIn:           false,
			EmailVerificationExpiresIn:  24 * time.Hour,
			PasswordResetExpiresIn:      time.Hour,
			RequestEmailChangeExpiresIn: time.Hour,
		}),
		sessionplugin.New(sessionplugin.SessionPluginConfig{
			Enabled: true,
		}),
		accesscontrolplugin.New(accesscontrolplugintypes.AccessControlPluginConfig{Enabled: true}),
		organizationsplugin.New(organizationsplugintypes.OrganizationsPluginConfig{
			Enabled:                          true,
			OrganizationsLimit:               new(1),
			MembersLimit:                     nil,
			InvitationsLimit:                 new(100),
			InvitationExpiresIn:              7 * 24 * time.Hour,
			RequireEmailVerifiedOnInvitation: false,
		}),
		ratelimitplugin.New(ratelimitplugintypes.RateLimitPluginConfig{
			Enabled:     true,
			Provider:    ratelimitplugintypes.RateLimitProviderRedis,
			Window:      time.Minute,
			Max:         100,
			CustomRules: map[string]ratelimitplugintypes.RateLimitRule{},
		}),
	}

	// Init Authula Instance
	auth := authula.New(&authula.AuthConfig{
		Config:  config,
		Plugins: plugins,
	})

	return auth
}
