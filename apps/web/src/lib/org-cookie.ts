import { parseCookie } from "cookie";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

export function getActiveOrgCookie(cookieHeader?: string): string | undefined {
	const header =
		cookieHeader ??
		(typeof document !== "undefined" ? document.cookie : undefined);
	if (!header) {
		return undefined;
	}
	return parseCookie(header)[COOKIE_CONSTANTS.activeOrgId.name];
}

export function setActiveOrgCookie(orgId: string) {
	if (typeof document === "undefined") {
		return;
	}
	const { name, path, maxAge } = COOKIE_CONSTANTS.activeOrgId;
	document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(orgId)}; path=${path}; max-age=${maxAge}; samesite=lax`;
}

export function clearActiveOrgCookie() {
	if (typeof document === "undefined") {
		return;
	}
	const { name, path } = COOKIE_CONSTANTS.activeOrgId;
	document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0`;
}
