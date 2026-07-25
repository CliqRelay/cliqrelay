import { parseCookie } from "cookie";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

export function getActiveTeamCookie(): string | undefined {
	if (typeof document === "undefined") {
		return undefined;
	}
	return parseCookie(document.cookie)[COOKIE_CONSTANTS.activeTeamId.name];
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
