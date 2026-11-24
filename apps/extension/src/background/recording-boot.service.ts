import type {
  OutboxLifecycle,
  RecordingLifecycleStore,
  RecordingStateMachine,
  RecordingStatus,
} from "@/models";
import { isDeveloperBuild } from "@/utils/diagnostics";

type RestoreRecordingSessionDeps = {
  lifecycleStore: RecordingLifecycleStore;
  recording: RecordingStateMachine;
  mirrorStatus: (status: RecordingStatus) => Promise<void>;
  hasSession?: (sessionId: string) => Promise<boolean>;
  isDev?: boolean;
  log?: (message: string, details: Record<string, unknown>) => void;
};

const liveStatuses: RecordingStatus[] = ["recording", "paused"];

const isLiveStatus = (status: RecordingStatus): boolean => liveStatuses.includes(status);

/**
 * Restores the recording session that was live when the worker last suspended.
 *
 * `storage.session` survives worker restarts but not browser restarts or
 * extension reloads, so a missing record means "idle". Captures now write
 * straight to Dexie, so a live status only needs its local session to exist;
 * there is no upload session to reattach.
 */
export const restoreRecordingSession = async ({
  lifecycleStore,
  recording,
  mirrorStatus,
  hasSession = async () => true,
  isDev = isDeveloperBuild,
  log = console.info,
}: RestoreRecordingSessionDeps): Promise<RecordingStatus> => {
  const lifecycle: OutboxLifecycle = await lifecycleStore.get();

  let status: RecordingStatus = "idle";
  if (isLiveStatus(lifecycle.status) && lifecycle.sessionId) {
    if (await hasSession(lifecycle.sessionId)) {
      recording.restore(lifecycle.status);
      status = lifecycle.status;
    }
  }

  if (lifecycle.status !== status) {
    await lifecycleStore.patch({
      status,
      ...(status === "idle" ? { sessionId: undefined } : {}),
    });
  }

  await mirrorStatus(status);

  if (isDev) {
    log("[background] Recording session boot", {
      status,
      persistedStatus: lifecycle.status,
      sessionId: lifecycle.sessionId ?? null,
    });
  }

  return status;
};
