import { createServerFn } from "@tanstack/react-start";

import {
	api,
	type CreateStepRequest,
	type Step,
	StepType,
	type UpdateGuideRequest,
} from "@repo/api-client";

import { authMiddleware } from "@/middleware/auth.middleware";

export const createGuide = createServerFn({ method: "POST" })
	.validator((input: { title: string; description?: string }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const response = await api.guides.createGuide(
				{
					title: data.title,
					description: data.description ?? null,
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
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		try {
			const guidesResponse = await api.guides.getAllGuides(
				{},
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
	.validator((input: { guideId: string; input: UpdateGuideRequest }) => input)
	.middleware([authMiddleware])
	.handler(async ({ data, context }) => {
		try {
			const updatedGuideResponse = await api.guides.updateGuide(
				data.guideId,
				data.input,
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
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		try {
			const guidesResponse = await api.guides.getStarredGuides({
				headers: {
					Cookie: context.headers.get("Cookie") ?? "",
				},
			});
			return guidesResponse.guides;
		} catch (error) {
			console.error("Failed to fetch starred guides:", error);
			return [];
		}
	});

export const getTrashGuides = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		try {
			const guidesResponse = await api.guides.getAllGuides(
				{
					status: "deleted",
				},
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
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		try {
			const cookieHeader = context.headers.get("Cookie") ?? "";

			const guideResponse = await api.guides.createGuide(
				{
					title: "Getting Started with CliqRelay",
					description: "A sample guide to show you how CliqRelay works",
				},
				{
					headers: {
						Cookie: cookieHeader,
					},
				},
			);

			const guideId = guideResponse.guide.id;

			const steps: CreateStepRequest[] = [
				{
					guideId,
					type: StepType.canvas,
					canvasContent: {
						type: "header",
						headingText: "Overview of CliqRelay",
						bodyText:
							"You can use this step to provide an overview or introduction to your guide.",
					},
				},
				{
					guideId,
					type: StepType.interaction,
					action: "click",
					actionText: `Click "Some Button"`,
					notes:
						"This step demonstrates a click step which will be accompanied by a screenshot of the action.",
				},
				{
					guideId,
					type: StepType.canvas,
					canvasContent: {
						type: "tip",
						headingText: "This is a note",
						bodyText:
							"You can use this step to provide additional information or tips related to the guide.",
					},
				},
				{
					guideId,
					type: StepType.canvas,
					canvasContent: {
						type: "callout",
						headingText: "Callout",
						bodyText:
							"This is a callout step, which can be used to draw attention to important information or warnings.",
					},
				},
				{
					guideId,
					type: StepType.canvas,
					canvasContent: {
						type: "alert",
						headingText: "Alert",
						bodyText:
							"This is an alert step, which can be used to highlight critical information or errors that users should be aware of.",
					},
				},
			];

			for (const step of steps) {
				await api.steps.createStep(step, {
					headers: {
						Cookie: cookieHeader,
					},
				});
			}

			return guideId;
		} catch (error) {
			console.error("Failed to create demo guide:", error);
			return null;
		}
	});
