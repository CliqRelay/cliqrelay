import { z } from "zod";

import type { LocalSession, LocalStep, OutboxCounts, SyncStatus } from "./outbox";
import { type RecordingStatus, recordingStatusSchema } from "./recording";
import { type ExtensionSettings, extensionSettingsSchema } from "./settings";
import { getValidationResult } from "./validation";

// The background still owns the port until PR 6 removes it, so the name stays
// exported for `entrypoints/background.ts`.
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
  "dismiss_job",
  "retry_failed",
  "discard_session",
  "discard_user_data",
  "dismiss_step",
] as const;

export const sidePanelCommandTypeSchema = z.enum(sidePanelCommandTypes);
export type SidePanelCommandType = z.infer<typeof sidePanelCommandTypeSchema>;

export const sidePanelCommandSchema = z.object({
  type: z.literal(sidePanelCommandType),
  command: sidePanelCommandTypeSchema,
  payload: extensionSettingsSchema.partial().optional(),
  jobId: z.string().optional(),
  stepId: z.string().optional(),
  sessionId: z.string().optional(),
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
  isDraining: z.boolean().optional(),
  isSignedOut: z.boolean().optional(),
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
  settings: ExtensionSettings | undefined;
};

export type SidePanelActions = {
  setSettings: (settings: ExtensionSettings) => void;
};

export type StepPreviewUrls = {
  screenshotUrl?: string;
  thumbnail?: string;
};

export type LocalSyncSessionSummary = {
  session: LocalSession;
  counts: OutboxCounts;
  failedSteps: LocalStep[];
};

export type LocalSyncOverview = {
  counts: OutboxCounts;
  sessions: LocalSyncSessionSummary[];
  otherSessions: LocalSession[];
};

export const emptyOutboxCounts: OutboxCounts = {
  pending: 0,
  uploading: 0,
  synced: 0,
  failed: 0,
  deleted: 0,
};

const phaseBySyncStatus: Record<SyncStatus, JobPhase> = {
  pending: "persisting",
  uploading: "uploading",
  synced: "completed",
  failed: "failed",
  deleted: "failed",
};

export const toUploadQueueInfo = (counts: OutboxCounts): UploadQueueInfo => ({
  pending: counts.pending,
  inProgress: counts.uploading,
  failed: counts.failed,
  completed: counts.synced,
});

export const deriveIsDraining = (
  status: RecordingStatus | undefined,
  counts: OutboxCounts,
): boolean => status === "stopped" && counts.pending + counts.uploading > 0;

export const toStepJobProgress = (
  step: LocalStep,
  preview: StepPreviewUrls = {},
): StepJobProgress | null => {
  if (step.syncStatus === "deleted") {
    return null;
  }

  const progress: StepJobProgress = {
    jobId: step.id,
    action: step.action,
    url: step.url,
    capturedAt: step.capturedAt,
    phase: phaseBySyncStatus[step.syncStatus],
  };

  if (step.serverStepId !== undefined) {
    progress.stepId = step.serverStepId;
  }
  if (step.guideId !== null) {
    progress.guideId = step.guideId;
  }
  if (step.actionText !== undefined) {
    progress.actionText = step.actionText;
  }
  if (step.retryCount > 0) {
    progress.attempts = step.retryCount;
  }
  if (step.lastError !== undefined) {
    progress.error = step.lastError;
  }
  if (step.targetElement !== undefined) {
    progress.targetElement = step.targetElement;
  }

  const screenshotUrl = step.serverScreenshotUrl ?? preview.screenshotUrl;
  if (screenshotUrl !== undefined) {
    progress.screenshotUrl = screenshotUrl;
  }
  if (preview.thumbnail !== undefined) {
    progress.thumbnail = preview.thumbnail;
  }

  return progress;
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
export type UploadScreenshotResult = z.infer<typeof uploadScreenshotResultSchema>;

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
