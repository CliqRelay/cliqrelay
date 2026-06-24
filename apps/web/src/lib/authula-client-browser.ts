import { createClient } from "authula";
import { CSRFPlugin, EmailPasswordPlugin } from "authula/plugins";

import { envClient } from "@/constants/env-client";

export const authulaBrowserClient = createClient({
	url: envClient.authulaUrl,
	plugins: [
		new EmailPasswordPlugin(),
		new CSRFPlugin({
			cookieName: "authula_csrf_token",
			headerName: "X-AUTHULA-CSRF-TOKEN",
		}),
	],
});
