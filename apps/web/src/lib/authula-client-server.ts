import { createClient } from "authula";
import {
	AdminPlugin,
	CorePlugin,
	CSRFPlugin,
	EmailPasswordPlugin,
	OrganizationsPlugin,
} from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { envServer } from "@/constants/env-server";
import { createSsrCookieStore } from "./ssr-cookie-store";

export const authulaServerClient = createClient({
	url: envServer.authulaUrl,
	cookies: createSsrCookieStore,
	plugins: [
		new CSRFPlugin({
			cookieName: COOKIE_CONSTANTS.csrf.name,
			headerName: HEADER_CONSTANTS.csrfToken,
		}),
		new CorePlugin(),
		new EmailPasswordPlugin(),
		new AdminPlugin(),
		new OrganizationsPlugin(),
	],
});
