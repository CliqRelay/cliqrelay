import type {
  RecordingLifecycle,
  RecordingLifecycleStorage,
  RecordingLifecycleStore,
} from "@/models";
import { recordingLifecycleSchema } from "@/models";
import { STORAGE_KEY_RECORDING_LIFECYCLE } from "@/utils/constants";

const idleLifecycle: RecordingLifecycle = { status: "idle" };

const parseLifecycle = (value: unknown): RecordingLifecycle =>
  recordingLifecycleSchema.catch(idleLifecycle).parse(value);

export const createRecordingLifecycleStore = (
  storage: RecordingLifecycleStorage,
): RecordingLifecycleStore => ({
  get: async () => {
    try {
      const items = await storage.get([STORAGE_KEY_RECORDING_LIFECYCLE]);
      return parseLifecycle(items[STORAGE_KEY_RECORDING_LIFECYCLE]);
    } catch {
      return idleLifecycle;
    }
  },
  set: async (lifecycle) => {
    try {
      await storage.set({ [STORAGE_KEY_RECORDING_LIFECYCLE]: lifecycle });
    } catch {
      // Session storage is a nicety; a failed write must not break recording.
    }
  },
});
