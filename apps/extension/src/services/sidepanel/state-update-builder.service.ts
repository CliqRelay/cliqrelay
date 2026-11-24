import type {
  RecordingSnapshot,
  SidePanelStateUpdate,
  StateUpdateBuilder,
  StepJobProgress,
  UploadQueueSnapshot,
} from "@/models";

/**
 * The positional arguments mirror the background call site until PR 6 removes
 * the port. Only status and the live flags are still produced: everything else
 * the sidepanel needs now comes from `storage.session` and Dexie.
 */
export const createStateUpdateBuilder = (
  getRecordingSnapshot: () => RecordingSnapshot,
  _getUploadQueueSnapshot: () => UploadQueueSnapshot,
  _getActiveGuideId: () => Promise<string | undefined>,
  _getJobProgress: () => StepJobProgress[],
  getIsDraining: () => boolean,
  getIsSignedOut: () => boolean,
): StateUpdateBuilder => {
  return async (): Promise<SidePanelStateUpdate> => ({
    status: getRecordingSnapshot().status,
    isDraining: getIsDraining(),
    isSignedOut: getIsSignedOut(),
  });
};

export type { StateUpdateBuilder };
