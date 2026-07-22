import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { api } from "@repo/api-client";

import { WORKSPACE_COOKIE_NAME } from "@/constants/workspace";
import { authMiddleware } from "@/middleware/auth.middleware";

export const createGuide = createServerFn({ method: "POST" })
	.validator((input: { title: string; description?: string; workspaceId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const response = await api.guides.createGuide(
				{
					title: data.title,
					description: data.description ?? null,
					workspaceId: data.workspaceId,
				},
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);

			return response.guide;
		} catch (error) {
			console.error("Failed to create guide:", error);
			return null;
		}
	});

export const getAllGuides = createServerFn({
	method: "GET",
})
	.validator((input?: { workspaceId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const workspaceId = data?.workspaceId ?? getCookie(WORKSPACE_COOKIE_NAME) ?? "";
			const guidesResponse = await api.guides.getAllGuides(
				{ workspaceId },
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return guidesResponse.guides;
		} catch (error) {
			console.error("Failed to fetch guides:", error);
			return [];
		}
	});

export const getGuideById = createServerFn({
	method: "GET",
})
	.validator((guideId: string) => guideId)
	.middleware([authMiddleware])
	.handler(async ({ data: guideId, context }) => {
		try {
			const guideResponse = await api.guides.getGuideById(guideId, {
				headers: {
					Cookie: context.headers.get("Cookie") ?? "",
				},
			});
			return guideResponse.guide;
		} catch (error) {
			console.error("Failed to fetch guide:", error);
			return null;
		}
	});

export const updateGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string; input: Record<string, unknown> }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const updatedGuideResponse = await api.guides.updateGuide(
				data.guideId,
				data.input as any,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return updatedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to update guide:", error);
			return null;
		}
	});

export const deleteGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const deletedGuideResponse = await api.guides.deleteGuide(data.guideId, {
				headers: {
					Cookie: context.headers.get("Cookie") ?? "",
				},
			});
			return deletedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to delete guide:", error);
			return null;
		}
	});

export const publishGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const publishedGuideResponse = await api.guides.publishGuide(
				data.guideId,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return publishedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to publish guide:", error);
			return null;
		}
	});

export const unpublishGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const unpublishedGuideResponse = await api.guides.unpublishGuide(
				data.guideId,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return unpublishedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to unpublish guide:", error);
			return null;
		}
	});

export const archiveGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const archivedGuideResponse = await api.guides.archiveGuide(
				data.guideId,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return archivedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to archive guide:", error);
			return null;
		}
	});

export const unarchiveGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const unarchivedGuideResponse = await api.guides.unarchiveGuide(
				data.guideId,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return unarchivedGuideResponse.guide;
		} catch (error) {
			console.error("Failed to unarchive guide:", error);
			return null;
		}
	});

export const restoreGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const restoredGuideResponse = await api.guides.restoreGuide(
				data.guideId,
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return restoredGuideResponse.guide;
		} catch (error) {
			console.error("Failed to restore guide:", error);
			return null;
		}
	});

export const permanentlyDeleteGuide = createServerFn({ method: "POST" })
	.validator((input: { guideId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const response = await api.guides.permanentlyDeleteGuide(data.guideId, {
				headers: {
					Cookie: context.headers.get("Cookie") ?? "",
				},
			});
			return response.guide;
		} catch (error) {
			console.error("Failed to permanently delete guide:", error);
			return null;
		}
	});

export const getStepsByGuideId = createServerFn({ method: "GET" })
	.validator((guideId: string) => guideId)
	.middleware([authMiddleware])
	.handler(async ({ data: guideId, context }) => {
		try {
			const response = await api.steps.getAllStepsByGuideId(
				{ guideId },
				{ headers: { Cookie: context.headers.get("Cookie") ?? "" } },
			);
			return response.steps;
		} catch (error) {
			console.error("Failed to fetch steps:", error);
			return [];
		}
	});

export const getStarredGuides = createServerFn({ method: "GET" })
	.validator((input?: { workspaceId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const workspaceId = data?.workspaceId ?? getCookie(WORKSPACE_COOKIE_NAME) ?? "";
			const guidesResponse = await api.guides.getStarredGuides(
				{ workspaceId },
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return guidesResponse.guides;
		} catch (error) {
			console.error("Failed to fetch starred guides:", error);
			return [];
		}
	});

export const getTrashGuides = createServerFn({ method: "GET" })
	.validator((input?: { workspaceId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const workspaceId = data?.workspaceId ?? getCookie(WORKSPACE_COOKIE_NAME) ?? "";
			const guidesResponse = await api.guides.getAllGuides(
				{ status: "deleted", workspaceId },
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
					},
				},
			);
			return guidesResponse.guides;
		} catch (error) {
			console.error("Failed to fetch trash guides:", error);
			return [];
		}
	});

export const createDemoGuide = createServerFn({ method: "POST" })
	.validator((input?: { workspaceId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const cookieHeader = context.headers.get("Cookie") ?? "";
			const workspaceId = data?.workspaceId ?? getCookie(WORKSPACE_COOKIE_NAME) ?? "";

			const response = await api.guides.createDemoGuide(
				{ workspaceId },
				{
					headers: {
						Cookie: cookieHeader,
					},
				},
			);

			return response.guideId;
		} catch (error) {
			console.error("Failed to create demo guide:", error);
			return null;
		}
	});
