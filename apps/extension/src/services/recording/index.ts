import { browser } from "wxt/browser";

import { createRecordingStatusStore } from "./recording-status.service";

export type { RecordingSnapshot, RecordingStateMachine } from "@/models";
export { createRecordingStateMachine } from "./recording.service";
export { createRecordingStatusStore } from "./recording-status.service";

export const recordingStatusStore = createRecordingStatusStore(
  browser.storage.local,
  browser.storage.onChanged,
);
