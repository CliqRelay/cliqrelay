import type { BrowserStorage, OutboxLifecycle, RecordingLifecycleStore } from "@/models";
import { outboxLifecycleSchema, recordingLifecycleSchema } from "@/models";
import { STORAGE_KEY_RECORDING_LIFECYCLE } from "@/utils/constants";

const idleLifecycle: OutboxLifecycle = { status: "idle", isSignedOut: false };

const parseLifecycle = (value: unknown): OutboxLifecycle => {
  const current = outboxLifecycleSchema.safeParse(value);
  if (current.success) {
    return current.data;
  }

  // Records written by 0.2.0 only carry status/sessionId.
  const legacy = recordingLifecycleSchema.safeParse(value);
  if (legacy.success) {
    return { ...legacy.data, isSignedOut: false };
  }

  return idleLifecycle;
};

const readLifecycle = async (storage: BrowserStorage): Promise<OutboxLifecycle> => {
  try {
    const items = await storage.get([STORAGE_KEY_RECORDING_LIFECYCLE]);
    return parseLifecycle(items[STORAGE_KEY_RECORDING_LIFECYCLE]);
  } catch {
    return idleLifecycle;
  }
};

const writeLifecycle = async (
  storage: BrowserStorage,
  lifecycle: OutboxLifecycle,
): Promise<void> => {
  try {
    await storage.set({ [STORAGE_KEY_RECORDING_LIFECYCLE]: lifecycle });
  } catch {
    // Session storage is a nicety; a failed write must not break recording.
  }
};

export const createRecordingLifecycleStore = (
  storage: BrowserStorage,
): RecordingLifecycleStore => ({
  get: () => readLifecycle(storage),
  set: (lifecycle) => writeLifecycle(storage, lifecycle),
  patch: async (changes) => {
    const current = await readLifecycle(storage);
    const next = { ...current, ...changes };
    await writeLifecycle(storage, next);
    return next;
  },
});
