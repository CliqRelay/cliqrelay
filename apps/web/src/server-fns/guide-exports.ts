import { createServerFn } from "@tanstack/react-start";

import { api, type ExportGuideFormat } from "@repo/api-client";

import { authMiddleware } from "@/middleware/auth.middleware";
import { getCsrfTokenHeader } from "../utils/http.utils";

export const exportGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string; format: ExportGuideFormat }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const response = await api.guides.exportGuide(
				data.guideId,
				{ format: data.format },
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
						...getCsrfTokenHeader()
					},
				},
			);

			return response;
		} catch (error) {
			console.error("Failed to export guide:", error);
			throw error;
		}
	});

export const getExportStatus = createServerFn({ method: "GET" })
	.validator((exportId: string) => exportId)
	.middleware([authMiddleware])
	.handler(async ({ data: exportId, context }) => {
		try {
			const response = await api.guides.getExportStatus(exportId, {
				headers: {
					Cookie: context.headers.get("Cookie") ?? "",
				},
			});

			return response.export;
		} catch (error) {
			console.error("Failed to get export status:", error);
			return null;
		}
	});
