import { createClient } from "authula";
import {
	AdminPlugin,
	CorePlugin,
	CSRFPlugin,
	EmailPasswordPlugin,
	OrganizationsPlugin,
} from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { envClient } from "@/constants/env-client";
import { CSRFBootstrapPlugin } from "./csrf-bootstrap-plugin";

export const authulaBrowserClient = createClient({
	url: envClient.authulaUrl,
	plugins: [
		// Has to stay ahead of CSRFPlugin so the cookie exists by the time it
		// looks for one.
		new CSRFBootstrapPlugin(),
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
