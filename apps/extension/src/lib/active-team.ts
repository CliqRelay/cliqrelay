import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { env } from "@/constants/env";

export const getActiveTeamId = async (): Promise<string | undefined> => {
	try {
		const cookie = await browser.cookies.get({
			url: env.VITE_API_URL,
			name: COOKIE_CONSTANTS.activeTeamId.name,
		});
		return cookie?.value;
	} catch {
		return undefined;
	}
};
