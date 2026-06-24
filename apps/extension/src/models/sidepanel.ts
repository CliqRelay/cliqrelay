import { z } from "zod";

import { type RecordingStatus, recordingStatusSchema } from "./recording";
import { type ExtensionSettings, extensionSettingsSchema } from "./settings";
import { getValidationResult } from "./validation";

export const SIDEPANEL_PORT_NAME = "cliqrelay-sidepanel" as const;

export const sidePanelCommandType = "cliqrelay.sidepanel-command" as const;

export const sidePanelCommandTypes = [
	"start_recording",
	"pause_recording",
	"resume_recording",
	"stop_recording",
	"get_status",
	"get_settings",
	"update_settings",
	"retry_failed_uploads",
] as const;

export const sidePanelCommandTypeSchema = z.enum(sidePanelCommandTypes);
export type SidePanelCommandType = z.infer<typeof sidePanelCommandTypeSchema>;

export const sidePanelCommandSchema = z.object({
	type: z.literal(sidePanelCommandType),
	command: sidePanelCommandTypeSchema,
	payload: extensionSettingsSchema.partial().optional(),
});
export type SidePanelCommand = z.infer<typeof sidePanelCommandSchema>;

export const uploadQueueInfoSchema = z.object({
	pending: z.number(),
	inProgress: z.number(),
	failed: z.number(),
	completed: z.number(),
});
export type UploadQueueInfo = z.infer<typeof uploadQueueInfoSchema>;

export const jobPhaseSchema = z.enum([
	"persisting",
	"upload_init",
	"uploading",
	"completing",
	"completed",
	"failed",
]);
export type JobPhase = z.infer<typeof jobPhaseSchema>;

export const stepJobProgressSchema = z.object({
	jobId: z.string(),
	stepId: z.string().optional(),
	guideId: z.string().optional(),
	action: z.string(),
	actionText: z.string().optional(),
	url: z.string(),
	capturedAt: z.string(),
	phase: jobPhaseSchema,
	attempts: z.number().optional(),
	error: z.string().optional(),
	screenshotUrl: z.string().optional(),
	thumbnail: z.string().optional(),
	targetElement: z.record(z.string(), z.unknown()).optional(),
});
export type StepJobProgress = z.infer<typeof stepJobProgressSchema>;

export const sidePanelStateUpdateSchema = z.object({
	status: recordingStatusSchema,
	bufferedCount: z.number(),
	isDraining: z.boolean().optional(),
	uploadQueue: uploadQueueInfoSchema.optional(),
	activeGuideId: z.string().nullish(),
	jobProgress: z.array(stepJobProgressSchema).optional(),
});
export type SidePanelStateUpdate = z.infer<typeof sidePanelStateUpdateSchema>;

export const sidePanelResponseSchema = z.discriminatedUnion("ok", [
	z.object({
		ok: z.literal(true),
		state: sidePanelStateUpdateSchema.optional(),
		settings: extensionSettingsSchema.optional(),
	}),
	z.object({ ok: z.literal(false), error: z.string() }),
]);
export type SidePanelResponse = z.infer<typeof sidePanelResponseSchema>;

export type SidePanelState = {
	status: RecordingStatus | undefined;
	bufferedCount: number;
	isDraining: boolean;
	settings: ExtensionSettings | undefined;
	uploadQueue: UploadQueueInfo;
	activeGuideId: string | null;
	jobProgress: StepJobProgress[];
};

export type SidePanelActions = {
	setStatus: (status: RecordingStatus) => void;
	setBufferedCount: (count: number) => void;
	setIsDraining: (isDraining: boolean) => void;
	setSettings: (settings: ExtensionSettings) => void;
	setUploadQueue: (queue: UploadQueueInfo) => void;
	setActiveGuideId: (id: string | null) => void;
	setJobProgress: (progress: StepJobProgress[]) => void;
	updateJobProgress: (jobId: string, updates: Partial<StepJobProgress>) => void;
	removeJobProgress: (jobId: string) => void;
	clear: () => void;
};

export const validateSidePanelCommand = (data: unknown) =>
	getValidationResult(data, sidePanelCommandSchema);

export const validateSidePanelStateUpdate = (data: unknown) =>
	getValidationResult(data, sidePanelStateUpdateSchema);

export const validateSidePanelResponse = (data: unknown) =>
	getValidationResult(data, sidePanelResponseSchema);

export type SidePanelPushMessage =
	| { type: "state_update"; state: SidePanelStateUpdate }
	| { type: "upload_progress"; queue: UploadQueueInfo }
	| { type: "job_progress"; progress: StepJobProgress };

export const uploadScreenshotResultSchema = z.object({
	url: z.string(),
	storagePath: z.string(),
});
export type UploadScreenshotResult = z.infer<
	typeof uploadScreenshotResultSchema
>;

export type UploadQueueSnapshot = {
	pending: number;
	inProgress: number;
	completed: number;
	failed: number;
	total: number;
};

export type CommandHandler = {
	handleCommand: (
		command: SidePanelCommand,
	) => Promise<SidePanelStateUpdate | ExtensionSettings | undefined>;
};

export type StateUpdateBuilder = () => Promise<SidePanelStateUpdate>;
