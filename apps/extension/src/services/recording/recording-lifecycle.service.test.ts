import { describe, expect, test, vi } from "vitest";

import { createRecordingLifecycleStore } from "./recording-lifecycle.service";
import { STORAGE_KEY_RECORDING_LIFECYCLE } from "@/utils/constants";

const createStorage = (items: Record<string, unknown> = {}) => ({
  get: vi.fn().mockResolvedValue(items),
  set: vi.fn().mockResolvedValue(undefined),
});

describe("recording lifecycle store", () => {
  test("returns the persisted lifecycle", async () => {
    const store = createRecordingLifecycleStore(
      createStorage({
        [STORAGE_KEY_RECORDING_LIFECYCLE]: {
          status: "paused",
          sessionId: "session-1",
          isSignedOut: false,
        },
      }),
    );

    await expect(store.get()).resolves.toEqual({
      status: "paused",
      sessionId: "session-1",
      isSignedOut: false,
    });
  });

  test("accepts a 0.2.0 lifecycle without isSignedOut", async () => {
    const store = createRecordingLifecycleStore(
      createStorage({
        [STORAGE_KEY_RECORDING_LIFECYCLE]: { status: "recording", sessionId: "session-1" },
      }),
    );

    await expect(store.get()).resolves.toEqual({
      status: "recording",
      sessionId: "session-1",
      isSignedOut: false,
    });
  });

  test("falls back to idle when the record is missing or invalid", async () => {
    const missing = createRecordingLifecycleStore(createStorage());
    const invalid = createRecordingLifecycleStore(
      createStorage({ [STORAGE_KEY_RECORDING_LIFECYCLE]: { status: "nope" } }),
    );

    await expect(missing.get()).resolves.toEqual({ status: "idle", isSignedOut: false });
    await expect(invalid.get()).resolves.toEqual({ status: "idle", isSignedOut: false });
  });

  test("falls back to idle when storage is unavailable", async () => {
    const storage = createStorage();
    storage.get.mockRejectedValue(new Error("session storage is not exposed here"));
    storage.set.mockRejectedValue(new Error("session storage is not exposed here"));

    const store = createRecordingLifecycleStore(storage);

    await expect(store.get()).resolves.toEqual({ status: "idle", isSignedOut: false });
    await expect(store.set({ status: "recording", isSignedOut: false })).resolves.toBeUndefined();
  });

  test("writes the lifecycle under its key", async () => {
    const storage = createStorage();

    await createRecordingLifecycleStore(storage).set({
      status: "recording",
      sessionId: "abc",
      isSignedOut: false,
    });

    expect(storage.set).toHaveBeenCalledWith({
      [STORAGE_KEY_RECORDING_LIFECYCLE]: {
        status: "recording",
        sessionId: "abc",
        isSignedOut: false,
      },
    });
  });

  test("patch merges fields and preserves the rest of the lifecycle", async () => {
    const storage = createStorage({
      [STORAGE_KEY_RECORDING_LIFECYCLE]: {
        status: "idle",
        sessionId: "session-1",
        isSignedOut: true,
        pendingStart: { clientGuideId: "client-1", startedAt: "2026-11-24T10:00:00.000Z" },
      },
    });
    const store = createRecordingLifecycleStore(storage);

    const lifecycle = await store.patch({ status: "recording", isSignedOut: false });

    expect(lifecycle).toEqual({
      status: "recording",
      sessionId: "session-1",
      isSignedOut: false,
      pendingStart: { clientGuideId: "client-1", startedAt: "2026-11-24T10:00:00.000Z" },
    });
    expect(storage.set).toHaveBeenCalledWith({
      [STORAGE_KEY_RECORDING_LIFECYCLE]: lifecycle,
    });
  });

  test("patch can clear pendingStart", async () => {
    const storage = createStorage({
      [STORAGE_KEY_RECORDING_LIFECYCLE]: {
        status: "recording",
        isSignedOut: false,
        pendingStart: { clientGuideId: "client-1", startedAt: "2026-11-24T10:00:00.000Z" },
      },
    });
    const store = createRecordingLifecycleStore(storage);

    const lifecycle = await store.patch({ pendingStart: undefined });

    expect(lifecycle.pendingStart).toBeUndefined();
  });
});
