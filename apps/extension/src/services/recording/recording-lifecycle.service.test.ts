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
        [STORAGE_KEY_RECORDING_LIFECYCLE]: { status: "paused", sessionId: "session-1" },
      }),
    );

    await expect(store.get()).resolves.toEqual({ status: "paused", sessionId: "session-1" });
  });

  test("falls back to idle when the record is missing or invalid", async () => {
    const missing = createRecordingLifecycleStore(createStorage());
    const invalid = createRecordingLifecycleStore(
      createStorage({ [STORAGE_KEY_RECORDING_LIFECYCLE]: { status: "nope" } }),
    );

    await expect(missing.get()).resolves.toEqual({ status: "idle" });
    await expect(invalid.get()).resolves.toEqual({ status: "idle" });
  });

  test("falls back to idle when storage is unavailable", async () => {
    const storage = createStorage();
    storage.get.mockRejectedValue(new Error("session storage is not exposed here"));
    storage.set.mockRejectedValue(new Error("session storage is not exposed here"));

    const store = createRecordingLifecycleStore(storage);

    await expect(store.get()).resolves.toEqual({ status: "idle" });
    await expect(store.set({ status: "recording" })).resolves.toBeUndefined();
  });

  test("writes the lifecycle under its key", async () => {
    const storage = createStorage();

    await createRecordingLifecycleStore(storage).set({ status: "recording", sessionId: "abc" });

    expect(storage.set).toHaveBeenCalledWith({
      [STORAGE_KEY_RECORDING_LIFECYCLE]: { status: "recording", sessionId: "abc" },
    });
  });
});
