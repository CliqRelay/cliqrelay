import { createClient } from "authula";
import {
	CorePlugin,
	CSRFPlugin,
	EmailPasswordPlugin,
	OrganizationsPlugin,
} from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { envClient } from "@/constants/env-client";

export const authulaBrowserClient = createClient({
	url: envClient.authulaUrl,
	plugins: [
		new CSRFPlugin({
			cookieName: COOKIE_CONSTANTS.csrf.name,
			headerName: HEADER_CONSTANTS.csrfToken,
		}),
		new CorePlugin(),
		new EmailPasswordPlugin(),
		new OrganizationsPlugin(),
	],
});
