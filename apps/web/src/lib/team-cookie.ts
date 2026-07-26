import { parseCookie } from "cookie";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

export function getActiveTeamCookie(cookieHeader?: string): string | undefined {
	const header =
		cookieHeader ??
		(typeof document !== "undefined" ? document.cookie : undefined);
	if (!header) {
		return undefined;
	}
	return parseCookie(header)[COOKIE_CONSTANTS.activeTeamId.name];
}

export function setActiveTeamCookie(teamId: string) {
	if (typeof document === "undefined") {
		return;
	}
	const { name, path, maxAge } = COOKIE_CONSTANTS.activeTeamId;
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(teamId)}; path=${path}; max-age=${maxAge}; samesite=lax`;
}

export function clearActiveTeamCookie() {
	if (typeof document === "undefined") {
		return;
	}
	const { name, path } = COOKIE_CONSTANTS.activeTeamId;
	document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0`;
}
