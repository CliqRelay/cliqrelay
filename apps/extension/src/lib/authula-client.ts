import { createClient } from "authula";
import { CorePlugin, CSRFPlugin } from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { env } from "@/constants/env";
import { createExtensionCookieStore } from "./extension-cookie-store";

/**
 * Authula client for extension pages.
 *
 * Only the plugins the side panel actually uses are registered: `CorePlugin`
 * for `getMe`, and `CSRFPlugin` so mutating calls carry the token. Signing in
 * happens in the web app, so the email/password, admin and organizations
 * plugins are not needed here.
 */
export const authulaClient = createClient({
	url: env.VITE_AUTHULA_URL,
	cookies: createExtensionCookieStore,
	plugins: [
		new CSRFPlugin({
			cookieName: COOKIE_CONSTANTS.csrf.name,
			headerName: HEADER_CONSTANTS.csrfToken,
		}),
		new CorePlugin(),
	],
});
