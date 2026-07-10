import { createMiddleware } from "@tanstack/react-start";

import { authulaClient } from "@/lib/authula-client";

export const authMiddleware = createMiddleware().server(
	async ({ request, next }) => {
		try {
			const response = await authulaClient.core.getMe();
			if (!response.user?.emailVerified) {
				return Response.json(new Error("Unauthorized: Email not verified"), {
					status: 401,
				});
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.message === "Unauthorized") {
				return Response.json(new Error("User not authenticated"), {
					status: 401,
				});
			}

			return Response.json(error, {
				status: 500,
			});
		}

		return next({
			context: {
				headers: request.headers,
			},
		});
	},
);
