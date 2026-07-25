import { parseCookie } from "cookie";

import { getCachedCsrfToken } from "@repo/api-client";
import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

export const getCsrfTokenHeader = (
	cookieHeader?: string | null,
): Record<string, string> => {
	const token =
		cookieHeader
			? parseCookie(cookieHeader)[COOKIE_CONSTANTS.csrf.name]
			: typeof document !== "undefined"
				? (parseCookie(document.cookie)[COOKIE_CONSTANTS.csrf.name] ??
					getCachedCsrfToken())
				: getCachedCsrfToken();

	if (!token) return {};

	return {
		[HEADER_CONSTANTS.csrfToken as string]: token,
	};
};
