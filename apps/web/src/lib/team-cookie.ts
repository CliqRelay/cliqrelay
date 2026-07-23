import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import {
	COOKIE_CONSTANTS,
} from "@repo/data-commons";

export function getActiveTeamCookie(): string | undefined {
	if (typeof document !== "undefined") {
		const match = document.cookie.match(
			new RegExp(`(?:^|;\\s*)${COOKIE_CONSTANTS.activeTeamId.name}=([^;]*)`),
		);
		return match ? match[1] : undefined;
	}
	return getCookie(COOKIE_CONSTANTS.activeTeamId.name);
}

export function setActiveTeamCookie(teamId: string) {
	setCookie(COOKIE_CONSTANTS.activeTeamId.name, teamId, {
		path: COOKIE_CONSTANTS.activeTeamId.path,
		maxAge: COOKIE_CONSTANTS.activeTeamId.maxAge,
		sameSite: "lax",
		httpOnly: false,
	});
}

export function clearActiveTeamCookie() {
	deleteCookie(COOKIE_CONSTANTS.activeTeamId.name, { path: COOKIE_CONSTANTS.activeTeamId.path });
}
