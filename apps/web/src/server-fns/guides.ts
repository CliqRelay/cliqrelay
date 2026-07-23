import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { api } from "@repo/api-client";
import { COOKIE_CONSTANTS } from "@repo/data-commons";

import { authMiddleware } from "@/middleware/auth.middleware";
import { getCsrfTokenHeader } from "../utils/http.utils";

export const createGuide = createServerFn({ method: "POST" })
	.validator((input: { title: string; description?: string; teamId: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const response = await api.guides.createGuide(
				{
					title: data.title,
					description: data.description ?? null,
					teamId: data.teamId,
				},
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
						...getCsrfTokenHeader()
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
	.validator((input?: { teamId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const teamId = data?.teamId ?? getCookie(COOKIE_CONSTANTS.activeTeamId.name) ?? "";
			const guidesResponse = await api.guides.getAllGuides(
				{ team_id: teamId },
				{
					headers: {
						Cookie: context.headers.get("Cookie") ?? "",
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
						...getCsrfTokenHeader()
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
					...getCsrfTokenHeader()
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
				{ guide_id: guideId },
				{ headers: { Cookie: context.headers.get("Cookie") ?? "" } },
			);
			return response.steps;
		} catch (error) {
			console.error("Failed to fetch steps:", error);
			return [];
		}
	});

export const getStarredGuides = createServerFn({ method: "GET" })
	.validator((input?: { teamId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const teamId = data?.teamId ?? getCookie(COOKIE_CONSTANTS.activeTeamId.name) ?? "";
			const guidesResponse = await api.guides.getStarredGuides(
				{ team_id: teamId },
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
	.validator((input?: { teamId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const teamId = data?.teamId ?? getCookie(COOKIE_CONSTANTS.activeTeamId.name) ?? "";
			const guidesResponse = await api.guides.getAllGuides(
				{ status: "deleted", team_id: teamId },
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
	.validator((input?: { teamId?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const cookieHeader = context.headers.get("Cookie") ?? "";
			const teamId = data?.teamId ?? getCookie(COOKIE_CONSTANTS.activeTeamId.name);
			if (!teamId) {
				return null;
			}

			const response = await api.guides.createDemoGuide(
				{ teamId },
				{
					headers: {
						Cookie: cookieHeader,
						...getCsrfTokenHeader()
					},
				},
			);

			return response.guideId;
		} catch (error) {
			console.error("Failed to create demo guide:", error);
			return null;
		}
	});
