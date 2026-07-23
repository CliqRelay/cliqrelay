import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import {
	COOKIE_CONSTANTS,
} from "@repo/data-commons";

export function getActiveWorkspaceCookie(): string | undefined {
	if (typeof document !== "undefined") {
		const match = document.cookie.match(
			new RegExp(`(?:^|;\\s*)${COOKIE_CONSTANTS.activeWorkspaceId.name}=([^;]*)`),
		);
		return match ? match[1] : undefined;
	}
	return getCookie(COOKIE_CONSTANTS.activeWorkspaceId.name);
}

export function setActiveWorkspaceCookie(workspaceId: string) {
	setCookie(COOKIE_CONSTANTS.activeWorkspaceId.name, workspaceId, {
		path: COOKIE_CONSTANTS.activeWorkspaceId.path,
		maxAge: COOKIE_CONSTANTS.activeWorkspaceId.maxAge,
		sameSite: "lax",
		httpOnly: false,
	});
}

export function clearActiveWorkspaceCookie() {
	deleteCookie(COOKIE_CONSTANTS.activeWorkspaceId.name, { path: COOKIE_CONSTANTS.activeWorkspaceId.path });
}
