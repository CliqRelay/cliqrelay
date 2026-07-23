import { createClient } from "authula";
import {
	CorePlugin,
	CSRFPlugin,
	EmailPasswordPlugin,
	OrganizationsPlugin,
} from "authula/plugins";

import { envClient } from "@/constants/env-client";

export const authulaBrowserClient = createClient({
	url: envClient.authulaUrl,
	plugins: [
		new CSRFPlugin({
			cookieName: "authula_csrf_token",
			headerName: "X-AUTHULA-CSRF-TOKEN",
		}),
		new CorePlugin(),
		new EmailPasswordPlugin(),
		new OrganizationsPlugin(),
	],
});
