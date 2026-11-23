import type { RecordingLifecycleStore, RecordingStateMachine, RecordingStatus } from "@/models";
import type { OffscreenManager } from "@/services/background/offscreen-manager.service";
import { isDeveloperBuild } from "@/utils/diagnostics";

type RestorableOffscreenManager = Pick<OffscreenManager, "restoreSession" | "getSessionId">;

type RestoreRecordingSessionDeps = {
  lifecycleStore: RecordingLifecycleStore;
  recording: RecordingStateMachine;
  offscreenManager: RestorableOffscreenManager;
  mirrorStatus: (status: RecordingStatus) => Promise<void>;
  isDev?: boolean;
  log?: (message: string, details: Record<string, unknown>) => void;
};

const liveStatuses: RecordingStatus[] = ["recording", "paused"];

const isLiveStatus = (status: RecordingStatus): boolean => liveStatuses.includes(status);

/**
 * Restores the recording session that was live when the worker last suspended.
 *
 * `storage.session` survives worker restarts but not browser restarts or
 * extension reloads, so a missing record means "idle". A record is only
 * honoured when the offscreen upload session can be reattached; otherwise the
 * worker would claim to record while every capture is silently dropped.
 */
export const restoreRecordingSession = async ({
  lifecycleStore,
  recording,
  offscreenManager,
  mirrorStatus,
  isDev = isDeveloperBuild,
  log = console.info,
}: RestoreRecordingSessionDeps): Promise<RecordingStatus> => {
  const lifecycle = await lifecycleStore.get();

  let status: RecordingStatus = "idle";
  if (isLiveStatus(lifecycle.status)) {
    const isReattached = await offscreenManager.restoreSession(lifecycle.sessionId);
    if (isReattached) {
      recording.restore(lifecycle.status);
      status = lifecycle.status;
    }
  }

  if (lifecycle.status !== status) {
    await lifecycleStore.set({ status });
  }

  await mirrorStatus(status);

  if (isDev) {
    log("[background] Recording session boot", {
      status,
      persistedStatus: lifecycle.status,
      sessionId: offscreenManager.getSessionId() ?? null,
    });
  }

  return status;
};
