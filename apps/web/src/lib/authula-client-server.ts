import { getStartContext } from "@tanstack/start-storage-context";
import { createClient } from "authula";
import {
	CorePlugin,
	CSRFPlugin,
	EmailPasswordPlugin,
	OrganizationsPlugin,
} from "authula/plugins";

import { COOKIE_CONSTANTS, HEADER_CONSTANTS } from "@repo/data-commons";

import { envServer } from "@/constants/env-server";

export const authulaServerClient = createClient({
	url: envServer.authulaUrl,
	cookies: () => {
		try {
			const ctx = getStartContext({ throwIfNotFound: false });
			if (!ctx) {
				return {
					getAll: () => [],
					set: () => { },
				};
			}

			const cookieHeader = ctx.request.headers.get("Cookie") || "";
			const cookies = cookieHeader
				.split(";")
				.map((c) => {
					const [name, value] = c.trim().split("=");
					return { name, value: decodeURIComponent(value || "") };
				})
				.filter((c) => c.name);

			return {
				getAll: () => cookies,
				set: () => { },
			};
		} catch {
			return {
				getAll: () => [],
				set: () => { },
			};
		}
	},
	plugins: [
		new CSRFPlugin({
			cookieName: COOKIE_CONSTANTS.csrf.name,
			headerName: HEADER_CONSTANTS.csrfToken
		}),
		new CorePlugin(),
		new EmailPasswordPlugin(),
		new OrganizationsPlugin(),
	],
});
