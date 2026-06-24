import { browser } from "wxt/browser";

import { env } from "@/constants/env";

export const getCsrfToken = async (): Promise<string | undefined> => {
	try {
		const cookie = await browser.cookies.get({
			url: env.VITE_API_URL,
			name: "authula_csrf_token",
		});
		return cookie?.value;
	} catch {
		return undefined;
	}
};

export const withCsrf = async (options?: RequestInit): Promise<RequestInit> => {
	const token = await getCsrfToken();
	return {
		credentials: "include",
		...options,
		headers: {
			...(token ? { "X-AUTHULA-CSRF-TOKEN": token } : {}),
			...((options?.headers as Record<string, string>) ?? {}),
		},
	};
};
