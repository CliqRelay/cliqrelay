import { browser } from "wxt/browser";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { RUNTIME_MESSAGE_TYPES } from "@/constants/runtime-message-types";
import { env } from "@/constants/env";

const getCsrfTokenFromBackground = async (): Promise<string | undefined> => {
	try {
		const token = await browser.runtime.sendMessage({
			type: RUNTIME_MESSAGE_TYPES.GET_CSRF_TOKEN,
		});
		if (typeof token === "string") {
			return token;
		}
	} catch {
		// background not available
	}
	return undefined;
};

export const getCsrfToken = async (): Promise<string | undefined> => {
	try {
		const cookie = await browser.cookies.get({
			url: env.VITE_API_URL,
			name: COOKIE_CONSTANTS.csrf.name,
		});
		if (cookie?.value) {
			return cookie.value;
		}
	} catch {
		// browser.cookies not available in this context (e.g. offscreen document)
	}
	return getCsrfTokenFromBackground();
};

export const withCsrf = async (options?: RequestInit): Promise<RequestInit> => {
	const token = await getCsrfToken();
	return {
		credentials: "include",
		...options,
		headers: {
			...(token ? { [HEADER_CONSTANTS.csrfToken]: token } : {}),
			...((options?.headers as Record<string, string>) ?? {}),
		},
	};
};
