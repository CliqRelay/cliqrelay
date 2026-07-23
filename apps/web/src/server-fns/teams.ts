import { createServerFn } from "@tanstack/react-start";

import { api } from "@repo/api-client";

import { authMiddleware } from "@/middleware/auth.middleware";

export const getTeams = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		const response = await api.teams.getTeams({
			headers: {
				Cookie: context?.headers?.get("Cookie") ?? "",
			},
		});

		return response;
	});
