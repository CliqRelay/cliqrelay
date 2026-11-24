import { describe, expect, test, vi } from "vitest";

import { restoreRecordingSession } from "./recording-boot.service";
import type { OutboxLifecycle } from "@/models";
import { createRecordingStateMachine } from "@/services/recording/recording.service";

const createDeps = ({
  lifecycle,
  hasSession = true,
}: {
  lifecycle: OutboxLifecycle;
  hasSession?: boolean;
}) => {
  const lifecycleStore = {
    get: vi.fn().mockResolvedValue(lifecycle),
    set: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockImplementation(async (changes: Partial<OutboxLifecycle>) => ({
      ...lifecycle,
      ...changes,
    })),
  };
  const checkSession = vi.fn().mockResolvedValue(hasSession);
  const mirrorStatus = vi.fn().mockResolvedValue(undefined);
  const log = vi.fn();
  const recording = createRecordingStateMachine("idle");

  return {
    recording,
    lifecycleStore,
    checkSession,
    mirrorStatus,
    log,
    deps: {
      lifecycleStore,
      recording,
      hasSession: checkSession,
      mirrorStatus,
      isDev: false,
      log,
    },
  };
};

describe("restore recording session", () => {
  test("restores a recording session from the persisted lifecycle", async () => {
    const { deps, recording, checkSession, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: { status: "recording", isSignedOut: false, sessionId: "session-1" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("recording");

    expect(checkSession).toHaveBeenCalledWith("session-1");
    expect(recording.getSnapshot().status).toBe("recording");
    expect(mirrorStatus).toHaveBeenCalledWith("recording");
    expect(lifecycleStore.patch).not.toHaveBeenCalled();
  });

  test("restores a paused session", async () => {
    const { deps, recording } = createDeps({
      lifecycle: { status: "paused", isSignedOut: false, sessionId: "session-1" },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("paused");
    expect(recording.getSnapshot().status).toBe("paused");
  });

  test("stays idle without touching storage when nothing was live", async () => {
    const { deps, recording, checkSession, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: { status: "idle", isSignedOut: false },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(checkSession).not.toHaveBeenCalled();
    expect(recording.getSnapshot().status).toBe("idle");
    expect(mirrorStatus).toHaveBeenCalledWith("idle");
    expect(lifecycleStore.patch).not.toHaveBeenCalled();
  });

  test("clears the lifecycle when the local session is gone", async () => {
    const { deps, recording, lifecycleStore, mirrorStatus } = createDeps({
      lifecycle: {
        status: "recording",
        isSignedOut: false,
        sessionId: "session-1",
        pendingStart: { clientGuideId: "client-1", startedAt: "2026-11-24T10:00:00.000Z" },
      },
      hasSession: false,
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(recording.getSnapshot().status).toBe("idle");
    expect(lifecycleStore.patch).toHaveBeenCalledWith({
      status: "idle",
      sessionId: undefined,
    });
    expect(mirrorStatus).toHaveBeenCalledWith("idle");
  });

  test("does not resume a session that was already stopped", async () => {
    const { deps, checkSession, lifecycleStore } = createDeps({
      lifecycle: { status: "stopped", isSignedOut: false },
    });

    await expect(restoreRecordingSession(deps)).resolves.toBe("idle");

    expect(checkSession).not.toHaveBeenCalled();
    expect(lifecycleStore.patch).toHaveBeenCalledWith({
      status: "idle",
      sessionId: undefined,
    });
  });

  test("logs the boot outcome in developer builds only", async () => {
    const idle = createDeps({ lifecycle: { status: "idle", isSignedOut: false } });
    await restoreRecordingSession({ ...idle.deps, isDev: false });
    expect(idle.log).not.toHaveBeenCalled();

    const live = createDeps({
      lifecycle: { status: "recording", isSignedOut: false, sessionId: "session-1" },
    });
    await restoreRecordingSession({ ...live.deps, isDev: true });

    expect(live.log).toHaveBeenCalledWith("[background] Recording session boot", {
      status: "recording",
      persistedStatus: "recording",
      sessionId: "session-1",
    });
  });
});
