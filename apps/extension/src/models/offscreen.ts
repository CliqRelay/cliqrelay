import { z } from "zod";

import { captureBridgeMessageSchema } from "./capture";
import { getValidationResult } from "./validation";

export const offscreenCommandTypeSchema = z.enum([
	"start_session",
	"process_capture",
	"stop_session",
	"get_state",
]);

export const offscreenCommandSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("start_session"),
		sessionId: z.string(),
		guideId: z.string().optional(),
	}),
	z.object({
		type: z.literal("process_capture"),
		jobId: z.string(),
		capture: captureBridgeMessageSchema,
		screenshotDataUrl: z.string(),
		tabId: z.number(),
	}),
	z.object({
		type: z.literal("stop_session"),
	}),
	z.object({
		type: z.literal("get_state"),
	}),
]);
export type OffscreenCommand = z.infer<typeof offscreenCommandSchema>;

export const offscreenEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("upload_progress"),
		jobId: z.string(),
		phase: z.enum(["upload_init", "uploading", "completing"]),
	}),
	z.object({
		type: z.literal("job_completed"),
		jobId: z.string(),
		storagePath: z.string(),
		screenshotUrl: z.string(),
		stepId: z.string(),
		guideId: z.string(),
		actionText: z.string().optional(),
		thumbnail: z.string().optional(),
		navStepId: z.string().optional(),
		navUrl: z.string().optional(),
		navCapturedAt: z.string().optional(),
		navScreenshotUrl: z.string().optional(),
		navThumbnail: z.string().optional(),
	}),
	z.object({
		type: z.literal("job_failed"),
		jobId: z.string(),
		error: z.string(),
		attempt: z.number(),
	}),
	z.object({
		type: z.literal("session_state"),
		pending: z.number(),
		active: z.number(),
		completed: z.number(),
		failed: z.number(),
	}),
	z.object({
		type: z.literal("drain_complete"),
		total: z.number(),
		succeeded: z.number(),
		failed: z.number(),
	}),
]);
export type OffscreenEvent = z.infer<typeof offscreenEventSchema>;

export const validateOffscreenCommand = (data: unknown) =>
	getValidationResult(data, offscreenCommandSchema);

export const validateOffscreenEvent = (data: unknown) =>
	getValidationResult(data, offscreenEventSchema);

export type OffscreenJob = {
	jobId: string;
	capture: z.infer<typeof captureBridgeMessageSchema>;
	screenshotDataUrl: string;
	tabId: number;
	guideId?: string;
};

export type OffscreenJobResult = {
	storagePath: string;
	screenshotUrl: string;
	stepId: string;
	guideId: string;
	actionText?: string;
	thumbnailBase64?: string;
	navStepId?: string;
	navUrl?: string;
	navCapturedAt?: string;
	navScreenshotUrl?: string;
	navThumbnail?: string;
};
