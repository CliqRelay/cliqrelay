import { getStartContext } from "@tanstack/start-storage-context";
import { createClient } from "authula";
import { CorePlugin, CSRFPlugin, EmailPasswordPlugin } from "authula/plugins";

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
		new CorePlugin(),
		new EmailPasswordPlugin(),
		new CSRFPlugin({
			cookieName: "authula_csrf_token",
			headerName: "X-AUTHULA-CSRF-TOKEN",
		}),
	],
});
