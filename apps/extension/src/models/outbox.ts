import { z } from "zod";

import { recordingStatusSchema } from "./recording";

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;

export const outboxRetention = {
  syncedSessionMs: HOURS_PER_DAY * MILLISECONDS_PER_HOUR,
  failedStepMs: 7 * HOURS_PER_DAY * MILLISECONDS_PER_HOUR,
  unsyncedDataMs: 7 * HOURS_PER_DAY * MILLISECONDS_PER_HOUR,
} as const;

export const syncStatusValues = ["pending", "uploading", "synced", "failed", "deleted"] as const;

export const syncStatusSchema = z.enum(syncStatusValues);
export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const localStepKindValues = ["interaction", "navigation"] as const;

export const localStepKindSchema = z.enum(localStepKindValues);
export type LocalStepKind = z.infer<typeof localStepKindSchema>;

export const localBlobKindValues = ["screenshot", "thumbnail"] as const;

export const localBlobKindSchema = z.enum(localBlobKindValues);
export type LocalBlobKind = z.infer<typeof localBlobKindSchema>;

export const outboxLifecycleSchema = z.object({
  status: recordingStatusSchema,
  sessionId: z.string().min(1).optional(),
  isSignedOut: z.boolean(),
  pendingStart: z
    .object({
      clientGuideId: z.string().min(1),
      startedAt: z.string().min(1),
    })
    .optional(),
});
export type OutboxLifecycle = z.infer<typeof outboxLifecycleSchema>;

export const localSessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  guideId: z.string().min(1).nullable(),
  clientGuideId: z.string().min(1),
  startedAt: z.string().min(1),
  stoppedAt: z.string().min(1).optional(),
  lastActivityAt: z.string().min(1),
  nextStepIndex: z.number().int().nonnegative(),
});
export type LocalSession = z.infer<typeof localSessionSchema>;

export const localStepSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  guideId: z.string().min(1).nullable(),
  stepIndex: z.number().int().nonnegative(),
  kind: localStepKindSchema,
  action: z.string(),
  actionText: z.string().optional(),
  url: z.string(),
  capturedAt: z.string().min(1),
  targetElement: z.record(z.string(), z.unknown()).optional(),
  typingSessionId: z.string().min(1).optional(),
  syncStatus: syncStatusSchema,
  retryCount: z.number().int().nonnegative(),
  serverStepId: z.string().min(1).optional(),
  serverScreenshotUrl: z.string().min(1).optional(),
  screenshotBlobId: z.string().min(1).optional(),
  thumbnailBlobId: z.string().min(1).optional(),
  lastError: z.string().optional(),
  lastAttemptAt: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type LocalStep = z.infer<typeof localStepSchema>;

export const localBlobSchema = z.object({
  id: z.string().min(1),
  stepId: z.string().min(1),
  kind: localBlobKindSchema,
  blob: z.instanceof(Blob),
  createdAt: z.string().min(1),
});
export type LocalBlob = z.infer<typeof localBlobSchema>;

export const outboxCountsSchema = z.object({
  pending: z.number().int().nonnegative(),
  uploading: z.number().int().nonnegative(),
  synced: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
});
export type OutboxCounts = z.infer<typeof outboxCountsSchema>;

export type DateInput = string | Date;

export type CreateSessionInput = {
  id?: string;
  userId: string;
  guideId: string | null;
  clientGuideId?: string;
  startedAt?: DateInput;
};

export type UpdateSessionInput = Partial<
  Pick<LocalSession, "guideId" | "stoppedAt" | "lastActivityAt" | "nextStepIndex">
>;

export type AppendStepInput = {
  id?: string;
  sessionId: string;
  guideId?: string | null;
  kind: LocalStepKind;
  action: string;
  actionText?: string;
  url: string;
  capturedAt: DateInput;
  targetElement?: Record<string, unknown>;
  typingSessionId?: string;
  screenshotBlobId?: string;
  thumbnailBlobId?: string;
  now?: DateInput;
};

export type UpsertTypingStepInput = AppendStepInput & {
  typingSessionId: string;
};

export type AppendStepWithBlobsInput = Omit<
  AppendStepInput,
  "screenshotBlobId" | "thumbnailBlobId"
>;

export type AppendNavigationStepInput = {
  sessionId: string;
  url: string;
  capturedAt: DateInput;
  guideId?: string | null;
  now?: DateInput;
};

export type CaptureBlobsInput = {
  screenshot: Blob;
  thumbnail: Blob;
};

export type PutBlobInput = {
  id?: string;
  stepId: string;
  kind: LocalBlobKind;
  blob: Blob;
  createdAt?: DateInput;
};

export type MarkStepSyncedInput = {
  serverStepId?: string;
  serverScreenshotUrl?: string;
  now?: DateInput;
};

export type ListSyncableStepsScope = {
  sessionId?: string;
  userId?: string;
};

export type StepDeletionOutcome = "removed" | "marked";

export type OutboxCleanupResult = {
  sessions: number;
  steps: number;
  blobs: number;
};
