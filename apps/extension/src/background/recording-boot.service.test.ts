import { describe, expect, test, vi } from "vitest";

import { restoreRecordingSession } from "./recording-boot.service";
import type { RecordingLifecycle } from "@/models";
import { createRecordingStateMachine } from "@/services/recording/recording.service";

const createDeps = ({
  lifecycle,
  isReattached = true,
  sessionId = "session-1",
}: {
  lifecycle: RecordingLifecycle;
  isReattached?: boolean;
  sessionId?: string | null;
}) => {
  const lifecycleStore = {
    get: vi.fn().mockResolvedValue(lifecycle),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const restoreSession = vi.fn().mockResolvedValue(isReattached);
  const getSessionId = vi.fn().mockReturnValue(sessionId);
  const mirrorStatus = vi.fn().mockResolvedValue(undefined);
  const log = vi.fn();
  const recording = createRecordingStateMachine("idle");

  return {
    recording,
    lifecycleStore,
    restoreSession,
    getSessionId,
    mirrorStatus,
    log,
    deps: {
      lifecycleStore,
      recording,
      offscreenManager: { restoreSession, getSessionId },
      mirrorStatus,
      isDev: false,
      log,
    },
  };
};

describe("restore recording session", () => {
  test("restores a recording session and keeps the persisted status", async () => {
    const { deps, recording, restoreSession, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: { status: "recording", sessionId: "session-1" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("recording");

    expect(restoreSession).toHaveBeenCalledWith("session-1");
    expect(recording.getSnapshot().status).toBe("recording");
    expect(mirrorStatus).toHaveBeenCalledWith("recording");
    expect(lifecycleStore.set).not.toHaveBeenCalled();
  });

  test("restores a paused session", async () => {
    const { deps, recording } = createDeps({
      lifecycle: { status: "paused", sessionId: "session-1" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("paused");
    expect(recording.getSnapshot().status).toBe("paused");
  });

  test("stays idle without touching storage when nothing was live", async () => {
    const { deps, recording, restoreSession, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: { status: "idle" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(restoreSession).not.toHaveBeenCalled();
    expect(recording.getSnapshot().status).toBe("idle");
    expect(mirrorStatus).toHaveBeenCalledWith("idle");
    expect(lifecycleStore.set).not.toHaveBeenCalled();
  });

  test("clears the lifecycle when the offscreen session cannot be reattached", async () => {
    const { deps, recording, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: { status: "recording", sessionId: "session-1" },
      isReattached: false,
      sessionId: null,
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(recording.getSnapshot().status).toBe("idle");
    expect(lifecycleStore.set).toHaveBeenCalledWith({ status: "idle" });
    expect(mirrorStatus).toHaveBeenCalledWith("idle");
  });

  test("does not resume a session that was already stopped", async () => {
    const { deps, restoreSession, lifecycleStore } = createDeps({
      lifecycle: { status: "stopped" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(restoreSession).not.toHaveBeenCalled();
    expect(lifecycleStore.set).toHaveBeenCalledWith({ status: "idle" });
  });

  test("logs the boot outcome in developer builds only", async () => {
    const idle = createDeps({ lifecycle: { status: "idle" } });
    await restoreRecordingSession({ ...idle.deps, isDev: false });
    expect(idle.log).not.toHaveBeenCalled();

    const live = createDeps({ lifecycle: { status: "recording", sessionId: "session-1" } });
    await restoreRecordingSession({ ...live.deps, isDev: true });

    expect(live.log).toHaveBeenCalledWith("[background] Recording session boot", {
      status: "recording",
      persistedStatus: "recording",
      sessionId: "session-1",
    });
  });
});
