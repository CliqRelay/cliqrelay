import type {
  RecordingStatus,
  RecordingStatusStorage,
  RecordingStatusStore,
  StorageChangeEvent,
  StorageChangeListener,
} from "@/models";
import { recordingStatusSchema } from "@/models";
import { STORAGE_KEY_RECORDING_STATUS } from "@/utils/constants";

const parseStatus = (value: unknown): RecordingStatus =>
  recordingStatusSchema.catch("idle").parse(value);

export const createRecordingStatusStore = (
  storage: RecordingStatusStorage,
  onChanged: StorageChangeEvent,
): RecordingStatusStore => ({
  get: async () => {
    try {
      const items = await storage.get([STORAGE_KEY_RECORDING_STATUS]);
      return parseStatus(items[STORAGE_KEY_RECORDING_STATUS]);
    } catch {
      return "idle";
    }
  },
  set: (status) => storage.set({ [STORAGE_KEY_RECORDING_STATUS]: status }),
  watch: (listener) => {
    const handleChange: StorageChangeListener = (changes, areaName) => {
      if (areaName !== "local" || !(STORAGE_KEY_RECORDING_STATUS in changes)) {
        return;
      }
      listener(parseStatus(changes[STORAGE_KEY_RECORDING_STATUS].newValue));
    };

    onChanged.addListener(handleChange);
    return () => onChanged.removeListener(handleChange);
  },
});
