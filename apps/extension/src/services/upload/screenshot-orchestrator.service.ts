import { api } from "@repo/api-client";

import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { withCsrf } from "@/lib/csrf";
import type { CaptureBridgeMessage } from "@/models";
import { buildActionText } from "@/utils/action-text";
import { processScreenshotForUpload } from "@/utils/image";

export type ScreenshotUploadOrchestrator = ReturnType<
	typeof createScreenshotUploadOrchestrator
>;

type CachedStepData = {
	stepId: string;
	guideId: string;
	actionText?: string;
	navStepId?: string;
	navUrl?: string;
	navCapturedAt?: string;
};

const stepCache = new Map<string, CachedStepData>();

export const createScreenshotUploadOrchestrator = (
	getOrCreateGuideId: () => Promise<{ guideId: string; isNew: boolean }>,
) => {
	const uploadScreenshotForStep = async (
		stepId: string,
		guideId: string,
		webpBlob: Blob,
		thumbnailBase64: string,
		width?: number,
		height?: number,
	): Promise<{ screenshotUrl: string; storagePath: string }> => {
		const presignResponse = await api.uploads.presignUpload(
			{
				stepId,
				guideId,
			},
			await withCsrf(),
		);
		const { presignedUrl, storagePath } = presignResponse;
		const uploadResponse = await fetch(presignedUrl, {
			method: "PUT",
			body: webpBlob,
			headers: { "Content-Type": "image/webp" },
		});
		if (!uploadResponse.ok) {
			throw new Error(`Failed to upload to S3: ${uploadResponse.status}`);
		}

		const completeResponse = await api.uploads.completeUpload(
			{
				stepId,
				storagePath,
				fileSize: webpBlob.size,
				mimeType: "image/webp",
				thumbnail: thumbnailBase64,
				width,
				height,
			},
			await withCsrf(),
		);

		return {
			screenshotUrl: completeResponse.url,
			storagePath,
		};
	};

	const processCaptureForUpload = async (
		dataUrl: string,
		message: CaptureBridgeMessage,
		thumbnailBase64?: string,
	): Promise<{
		stepId: string;
		guideId: string;
		screenshotUrl: string;
		storagePath: string;
		thumbnailBase64: string;
		actionText?: string;
		navStepId?: string;
		navUrl?: string;
		navCapturedAt?: string;
		navScreenshotUrl?: string;
		navThumbnail?: string;
	}> => {
		const { webpBlob, thumbnailBase64: generatedThumbnail, width, height } =
			await processScreenshotForUpload(dataUrl);
		const finalThumbnail = thumbnailBase64 ?? generatedThumbnail;

		const { guideId, isNew } = await getOrCreateGuideId();

		if (message.payload.action === "navigation") {
			const captureId = message.payload.captureId;
			if (captureId) {
				const cached = stepCache.get(captureId);
				if (cached) {
					const { screenshotUrl, storagePath } = await uploadScreenshotForStep(
						cached.stepId,
						cached.guideId,
						webpBlob,
						finalThumbnail,
						width,
						height,
					);
					return {
						stepId: cached.stepId,
						guideId: cached.guideId,
						screenshotUrl,
						storagePath,
						thumbnailBase64: finalThumbnail,
					};
				}
			}
			const url = message.payload.navigationUrl ?? message.payload.url;
			const stepWorkspaceId = await getActiveWorkspaceId();
			const stepResponse = await api.steps.createStep(
				{
					guideId,
					workspaceId: stepWorkspaceId ?? "",
					type: "interaction",
					action: "navigation",
					url,
					actionText: `Navigate to "${url}"`,
				},
				await withCsrf(),
			);
			const stepId = stepResponse.step.id;
			if (captureId) {
				stepCache.set(captureId, { stepId, guideId });
			}
			const { screenshotUrl, storagePath } = await uploadScreenshotForStep(
				stepId,
				guideId,
				webpBlob,
				finalThumbnail,
				width,
				height,
			);
			return {
				stepId,
				guideId,
				screenshotUrl,
				storagePath,
				thumbnailBase64: finalThumbnail,
			};
		}

		let navStepId: string | undefined;
		let navUrl: string | undefined;
		let navCapturedAt: string | undefined;
		let navScreenshotUrl: string | undefined;
		let navThumbnail: string | undefined;

		const captureId = message.payload.captureId;
		if (captureId) {
			const cached = stepCache.get(captureId);
			if (cached) {
				const { screenshotUrl, storagePath } = await uploadScreenshotForStep(
					cached.stepId,
					cached.guideId,
					webpBlob,
					finalThumbnail,
					width,
					height,
				);

				if (cached.navStepId) {
					const navResult = await uploadScreenshotForStep(
						cached.navStepId,
						cached.guideId,
						webpBlob,
						finalThumbnail,
						width,
						height,
					);
					navScreenshotUrl = navResult.screenshotUrl;
					navThumbnail = finalThumbnail;
				}

			return {
				stepId: cached.stepId,
				guideId: cached.guideId,
				screenshotUrl,
				storagePath,
				thumbnailBase64: finalThumbnail,
				actionText: cached.actionText,
				navStepId: cached.navStepId,
				navUrl: cached.navUrl,
				navCapturedAt: cached.navCapturedAt,
				navScreenshotUrl,
				navThumbnail,
			};
			}
		}

		const activeWorkspaceId = await getActiveWorkspaceId();

		if (isNew) {
			navUrl = message.payload.navigationUrl ?? message.payload.url;
			navCapturedAt = message.payload.capturedAt;
			const navStepResponse = await api.steps.createStep(
				{
					guideId,
					workspaceId: activeWorkspaceId ?? "",
					type: "interaction",
					action: "navigation",
					url: navUrl,
					actionText: `Navigate to "${navUrl}"`,
				},
				await withCsrf(),
			);
			navStepId = navStepResponse.step.id;
		}

		const stepResponse = await api.steps.createStep(
			{
				guideId,
				workspaceId: activeWorkspaceId ?? "",
				type: "interaction",
				action: message.payload.action,
				url: message.payload.url,
				targetElement: message.payload.targetElement ?? undefined,
			actionText: buildActionText(
				message.payload.action,
				message.payload.targetElement,
				message.payload.typedText,
				message.payload.keyCombo,
			),
		},
		await withCsrf(),
	);
	const stepId = stepResponse.step.id;
	const actionText = stepResponse.step.actionText ?? buildActionText(
		message.payload.action,
		message.payload.targetElement,
		message.payload.typedText,
		message.payload.keyCombo,
	);
		if (captureId) {
			stepCache.set(captureId, { stepId, guideId, actionText, navStepId, navUrl, navCapturedAt });
		}

		const { screenshotUrl, storagePath } = await uploadScreenshotForStep(
			stepId,
			guideId,
			webpBlob,
			finalThumbnail,
			width,
			height,
		);

		if (navStepId) {
			const navResult = await uploadScreenshotForStep(
				navStepId,
				guideId,
				webpBlob,
				finalThumbnail,
				width,
				height,
			);
			navScreenshotUrl = navResult.screenshotUrl;
			navThumbnail = finalThumbnail;
		}

		return {
			stepId,
			guideId,
			screenshotUrl,
			storagePath,
			thumbnailBase64: finalThumbnail,
			actionText,
			navStepId,
			navUrl,
			navCapturedAt,
			navScreenshotUrl,
			navThumbnail,
		};
	};

	return { processCaptureForUpload };
};
