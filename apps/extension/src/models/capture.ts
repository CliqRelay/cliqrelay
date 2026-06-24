import { z } from "zod";

import { CliqRelayEvents } from "@repo/data-commons";

import { targetElementSchema } from "./elements";
import { getValidationResult } from "./validation";

const stepActionSchema = z.enum(["click", "input", "navigation"]);

export const recentCaptureSchema = z.object({
	action: z.string(),
	url: z.string(),
	capturedAt: z.string(),
	screenshotUrl: z.string().optional(),
	failed: z.boolean().optional(),
});
export type RecentCapture = z.infer<typeof recentCaptureSchema>;

// Schemas

export const captureActionSchema = stepActionSchema;
export type CaptureAction = z.infer<typeof captureActionSchema>;

export const captureEventPayloadSchema = z.object({
	captureId: z.string().optional(),
	action: captureActionSchema,
	url: z.string(),
	capturedAt: z.string(),
	tabId: z.string().optional(),
	targetElement: targetElementSchema.optional(),
	screenshotUrl: z.string().optional(),
	navigationUrl: z.string().optional(),
});
export type CaptureEventPayload = z.infer<typeof captureEventPayloadSchema>;

export const captureBridgeMessageSchema = z.object({
	source: z.enum(["content-script", "background"]),
	type: z.enum(CliqRelayEvents),
	payload: captureEventPayloadSchema,
});
export type CaptureBridgeMessage = z.infer<typeof captureBridgeMessageSchema>;

export const validateCaptureBridgeMessage = (data: unknown) =>
	getValidationResult(data, captureBridgeMessageSchema);

export const bufferedCaptureSchema = z.object({
	tabId: z.number(),
	message: captureBridgeMessageSchema,
});
export type BufferedCapture = z.infer<typeof bufferedCaptureSchema>;

// Types

export type CaptureSink = (
	message: CaptureBridgeMessage,
) => void | Promise<void>;

export type CaptureService = {
	start: (root?: Document) => () => void;
};

export type CapturedStepEntry = {
	storagePath: string;
	stepId?: string;
	guideId?: string;
	tabId: number;
};

export type CaptureMetadataEntry = {
	action: string;
	url: string;
	capturedAt: string;
	actionText?: string;
	targetElement?: {
		clickX?: number;
		clickY?: number;
		viewportWidth?: number;
		viewportHeight?: number;
	};
};

export type CaptureProcessor = {
	processCapture: (
		message: CaptureBridgeMessage,
		tabId: number,
	) => Promise<{
		stepId: string;
		guideId: string;
		screenshotUrl: string;
		storagePath: string;
		thumbnailBase64: string;
		navStepId?: string;
		navUrl?: string;
		navCapturedAt?: string;
		navScreenshotUrl?: string;
		navThumbnail?: string;
	} | null>;
};
