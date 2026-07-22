import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import {
	WORKSPACE_COOKIE_NAME,
	WORKSPACE_COOKIE_MAX_AGE,
	WORKSPACE_COOKIE_PATH,
} from "@/constants/workspace";

export function getActiveWorkspaceCookie(): string | undefined {
	return getCookie(WORKSPACE_COOKIE_NAME);
}

export function setActiveWorkspaceCookie(workspaceId: string) {
	setCookie(WORKSPACE_COOKIE_NAME, workspaceId, {
		path: WORKSPACE_COOKIE_PATH,
		maxAge: WORKSPACE_COOKIE_MAX_AGE,
		sameSite: "lax",
		httpOnly: false,
	});
}

export function clearActiveWorkspaceCookie() {
	deleteCookie(WORKSPACE_COOKIE_NAME, { path: WORKSPACE_COOKIE_PATH });
}
