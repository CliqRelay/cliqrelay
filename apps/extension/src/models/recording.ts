import { z } from "zod";

import type { OutboxLifecycle } from "./outbox";
import type { BrowserStorage } from "@/models/storage";

export const recordingStatusValues = ["idle", "recording", "paused", "stopped"] as const;

export const recordingStatusSchema = z.enum(recordingStatusValues);
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;

export const recordingLifecycleSchema = z.object({
  status: recordingStatusSchema,
  sessionId: z.string().optional(),
});
export type RecordingLifecycle = z.infer<typeof recordingLifecycleSchema>;

export type RecordingSnapshot = {
  status: RecordingStatus;
};

export type RecordingStateMachine = {
  getSnapshot: () => RecordingSnapshot;
  restore: (status: RecordingStatus) => RecordingSnapshot;
  start: () => RecordingSnapshot;
  pause: () => RecordingSnapshot;
  resume: () => RecordingSnapshot;
  stop: () => RecordingSnapshot;
};

export type OnRecordingStatusChange = (status: RecordingStatus) => void;

export type StorageChangeListener = (
  changes: Record<string, { newValue?: unknown }>,
  areaName: string,
) => void;

export type StorageChangeEvent = {
  addListener: (listener: StorageChangeListener) => void;
  removeListener: (listener: StorageChangeListener) => void;
};

export type RecordingStatusStorage = {
  get: (keys: string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
};

export type RecordingLifecycleStorage = BrowserStorage;

export type RecordingLifecycleStore = {
  get: () => Promise<OutboxLifecycle>;
  set: (lifecycle: OutboxLifecycle) => Promise<void>;
  patch: (changes: Partial<OutboxLifecycle>) => Promise<OutboxLifecycle>;
};

export type RecordingStatusStore = {
  get: () => Promise<RecordingStatus>;
  set: (status: RecordingStatus) => Promise<void>;
  watch: (listener: OnRecordingStatusChange) => () => void;
};
