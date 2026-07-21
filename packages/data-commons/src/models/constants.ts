export const INDICATOR_DEFAULTS = {
	size: 40,
	color: "#eab308",
	borderWidth: 2,
	style: "rounded-full",
} as const;

export const COOKIE_CONSTANTS = {
	csrf: {
		name: "authula_csrf_token"
	},
	activeTeamId: {
		name: "cliqrelay_active_team_id",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/"
	}
} as const;


export const HEADER_CONSTANTS = {
	csrfToken: "X-AUTHULA-CSRF-TOKEN"
} as const;
