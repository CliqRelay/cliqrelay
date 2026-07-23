import { createServerFn } from "@tanstack/react-start";

import { api } from "@repo/api-client";

import { authMiddleware } from "@/middleware/auth.middleware";
import { getCsrfTokenHeader } from "../utils/http.utils";

export const starGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const starredGuideResponse = await api.guides.starGuide(data.guideId, {
			headers: {
				Cookie: context.headers.get("Cookie") ?? "",
				...getCsrfTokenHeader()
			},
		});
		return starredGuideResponse.message;
	});

export const unstarGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		const unstarredGuideResponse = await api.guides.unstarGuide(data.guideId, {
			headers: {
				Cookie: context.headers.get("Cookie") ?? "",
				...getCsrfTokenHeader()
			},
		});
		return unstarredGuideResponse.message;
	});
