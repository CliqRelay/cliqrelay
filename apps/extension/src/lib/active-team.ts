import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { env } from "@/constants/env";
import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";

const getActiveTeamIdFromBackground = async (): Promise<
	string | undefined
> => {
	try {
		const teamId = await browser.runtime.sendMessage({
			type: RUNTIME_MESSAGE_TYPES.GET_ACTIVE_TEAM_ID,
		});
		if (typeof teamId === "string") {
			return teamId;
		}
	} catch {
		// background not available
	}
	return undefined;
};

export const getActiveTeamId = async (): Promise<string | undefined> => {
	try {
		const cookie = await browser.cookies.get({
			url: env.VITE_API_URL,
			name: COOKIE_CONSTANTS.activeTeamId.name,
		});
		if (cookie?.value) {
			return cookie.value;
		}
	} catch {
		// browser.cookies not available in this context (e.g. offscreen document)
	}
	return getActiveTeamIdFromBackground();
};
